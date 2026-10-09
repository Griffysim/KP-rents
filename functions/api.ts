import { randomUUID } from 'node:crypto';
import { attachDatabasePool } from '@neon/functions';
import { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';

const databaseUrl = process.env.DATABASE_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authJwksUrl = process.env.NEON_AUTH_JWKS_URL;

if (!databaseUrl || !authBaseUrl || !authJwksUrl) {
  throw new Error('DATABASE_URL, NEON_AUTH_BASE_URL, and NEON_AUTH_JWKS_URL are required.');
}

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
attachDatabasePool(pool);

const jwks = createRemoteJWKSet(new URL(authJwksUrl));
const issuer = new URL(authBaseUrl).origin;
const configuredOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const uuid = z.string().uuid();
const date = z.string().date();
const money = z.coerce.number().finite().min(0).max(100_000_000);
const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const propertyInput = z.object({
  name: requiredText(2, 160),
  unitNumber: optionalText(80),
  monthlyRent: money,
});

const tenantInput = z.object({
  propertyId: uuid,
  name: requiredText(2, 120),
  email: z.string().trim().email().max(320),
  phone: optionalText(40),
  monthlyRent: money,
});

const paymentInput = z.object({
  tenantId: uuid,
  paymentDate: date,
  amount: money.positive(),
  method: z.enum(['bank_transfer', 'cash', 'card', 'other']),
  note: optionalText(1000),
});

const rateInput = z.object({
  electricityRate: z.coerce.number().finite().min(0).max(100_000),
  waterRate: z.coerce.number().finite().min(0).max(100_000),
});

const readingInput = z.object({
  tenantId: uuid.optional(),
  readingDate: date,
  utilityType: z.enum(['electricity', 'water']),
  currentReading: z.coerce.number().finite().min(0).max(100_000_000),
  note: optionalText(1000),
});

const invoiceInput = z.object({
  tenantId: uuid,
  periodStart: date,
  periodEnd: date,
  dueDate: date,
  additionalAmount: money.optional().default(0),
  additionalNote: optionalText(1000),
});

const messageInput = z.object({
  tenantId: uuid.optional(),
  parentMessageId: uuid.optional().nullable(),
  subject: requiredText(2, 200),
  body: requiredText(1, 5000),
});

const expenseInput = z.object({
  propertyId: uuid.optional().nullable(),
  category: requiredText(2, 80),
  amount: money.positive(),
  expenseDate: date,
  description: optionalText(2000),
});

type LandlordActor = {
  kind: 'landlord';
  userId: string;
  landlordId: string;
  organizationId: string;
};

type TenantActor = {
  kind: 'tenant';
  userId: string;
  tenantId: string;
  landlordId: string;
};

type Actor = LandlordActor | TenantActor;
type Variables = { userId: string; actor?: Actor };

const app = new Hono<{ Variables: Variables }>();

function corsHeaders(origin?: string) {
  const isLocal = Boolean(origin && (origin.startsWith('http://localhost:') || origin === 'capacitor://localhost'));
  const allowed = !origin || configuredOrigins.size === 0 || configuredOrigins.has(origin) || isLocal;
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': configuredOrigins.size === 0 ? '*' : origin ?? '*' } : {}),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function withCors<T extends Response>(response: T, origin?: string): T {
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    if (value) response.headers.set(key, value);
  }
  return response;
}

function asJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map(asJson) as T;
  if (!value || typeof value !== 'object') return value;
  const numericColumns = new Set([
    'monthly_rent',
    'electricity_rate',
    'water_rate',
    'previous_reading',
    'current_reading',
    'consumption',
    'amount',
    'total',
    'utility_total',
    'additional_amount',
  ]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      numericColumns.has(key) && typeof entry === 'string' ? Number(entry) : entry,
    ]),
  ) as T;
}

function invalid(message: string, status = 400) {
  return { error: { message }, status };
}

function parsed<T extends z.ZodType>(schema: T, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return invalid(result.error.issues[0]?.message ?? 'Invalid request data.');
  }
  return { data: result.data };
}

async function query<T extends Record<string, unknown>>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values);
  return result.rows.map(asJson);
}

async function one<T extends Record<string, unknown>>(text: string, values: unknown[] = []) {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resolveActor(userId: string): Promise<Actor | null> {
  const landlord = await one<LandlordActor>(
    `SELECT 'landlord' AS kind, lp.user_id AS "userId", lp.id AS "landlordId", lp.organization_id AS "organizationId"
       FROM public.landlord_profiles lp
       JOIN neon_auth.member m
         ON m."userId" = lp.user_id
        AND m."organizationId" = lp.organization_id
      WHERE lp.user_id = $1
        AND m.role IN ('owner', 'admin')`,
    [userId],
  );
  if (landlord) return landlord;

  return one<TenantActor>(
    `SELECT 'tenant' AS kind, t.user_id AS "userId", t.id AS "tenantId", t.landlord_id AS "landlordId"
       FROM public.tenants t
      WHERE t.user_id = $1
        AND t.status = 'active'`,
    [userId],
  );
}

async function getUserEmail(userId: string) {
  const user = await one<{ email: string }>(
    'SELECT email FROM neon_auth."user" WHERE id = $1',
    [userId],
  );
  return user?.email ?? null;
}

function getActor(c: { get: (key: 'actor') => Actor | undefined }) {
  const actor = c.get('actor');
  if (!actor) throw new ApiError(403, 'Your account is not linked to a KP-Rents profile.');
  return actor;
}

function landlordOnly(actor: Actor): LandlordActor {
  if (actor.kind !== 'landlord') throw new ApiError(403, 'Landlord access is required.');
  return actor;
}

function tenantOnly(actor: Actor): TenantActor {
  if (actor.kind !== 'tenant') throw new ApiError(403, 'Tenant access is required.');
  return actor;
}

class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  if (c.req.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), origin);
  await next();
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    if (value) c.header(key, value);
  }
});

app.get('/health', async (c) => {
  await pool.query('SELECT 1');
  return c.json({ ok: true, service: 'kp-rents-api' });
});

app.use('/v1/*', async (c, next) => {
  const authorization = c.req.header('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return c.json({ error: { message: 'Authentication is required.' } }, 401);
  }
  try {
    const { payload } = await jwtVerify(authorization.slice(7), jwks, { issuer });
    if (!payload.sub) return c.json({ error: { message: 'Authentication is required.' } }, 401);
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: { message: 'Your sign-in token is invalid or has expired.' } }, 401);
  }
});

app.use('/v1/*', async (c, next) => {
  const publicSetupPaths = ['/v1/bootstrap/landlord', '/v1/tenant/claim'];
  if (publicSetupPaths.includes(new URL(c.req.url).pathname)) return next();
  const actor = await resolveActor(c.get('userId'));
  if (!actor) return c.json({ error: { message: 'Your account has no KP-Rents access yet.' } }, 403);
  c.set('actor', actor);
  await next();
});

app.post('/v1/bootstrap/landlord', async (c) => {
  const parsedBody = parsed(z.object({
    displayName: requiredText(2, 120),
    organizationId: uuid,
  }), await c.req.json());
  if ('error' in parsedBody) return c.json({ error: parsedBody.error }, parsedBody.status as 400);

  const userId = c.get('userId');
  const email = await getUserEmail(userId);
  if (!email) return c.json({ error: { message: 'Authenticated user was not found.' } }, 401);

  const membership = await one<{ role: string }>(
    `SELECT role FROM neon_auth.member
      WHERE "userId" = $1 AND "organizationId" = $2 AND role = 'owner'`,
    [userId, parsedBody.data.organizationId],
  );
  if (!membership) {
    return c.json({ error: { message: 'Create a KP-Rents organization before starting your landlord profile.' } }, 403);
  }

  const existing = await one<{ id: string }>('SELECT id FROM public.landlord_profiles WHERE user_id = $1', [userId]);
  if (existing) return c.json({ data: { landlordId: existing.id, created: false } });

  const profile = await withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.landlord_profiles (id, user_id, organization_id, display_name, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [randomUUID(), userId, parsedBody.data.organizationId, parsedBody.data.displayName, email],
    );
    const landlordId = inserted.rows[0].id;
    await client.query(
      'INSERT INTO public.utility_rates (landlord_id) VALUES ($1)',
      [landlordId],
    );
    await client.query(
      `INSERT INTO public.expense_categories (landlord_id, name, icon, is_default)
       VALUES ($1, 'Maintenance', '🔧', true), ($1, 'Utilities', '💡', true),
              ($1, 'Insurance', '🛡️', true), ($1, 'Rates & Taxes', '🏛️', true),
              ($1, 'Other', '•', true)`,
      [landlordId],
    );
    return { landlordId };
  });

  return c.json({ data: { ...profile, created: true } }, 201);
});

app.post('/v1/tenant/claim', async (c) => {
  const userId = c.get('userId');
  const email = await getUserEmail(userId);
  if (!email) return c.json({ error: { message: 'Authenticated user was not found.' } }, 401);

  const alreadyClaimed = await one<{ id: string }>('SELECT id FROM public.tenants WHERE user_id = $1', [userId]);
  if (alreadyClaimed) return c.json({ data: { tenantId: alreadyClaimed.id, claimed: false } });

  const invitation = await one<{ id: string; organization_id: string }>(
    `SELECT t.id, lp.organization_id
       FROM public.tenants t
       JOIN public.landlord_profiles lp ON lp.id = t.landlord_id
       JOIN neon_auth.member m ON m."organizationId" = lp.organization_id
      WHERE lower(t.email) = lower($1)
        AND t.status = 'invited'
        AND m."userId" = $2
      ORDER BY t.created_at DESC
      LIMIT 1`,
    [email, userId],
  );
  if (!invitation) {
    return c.json({ error: { message: 'No matching landlord invitation was found for this verified email.' } }, 403);
  }

  await pool.query(
    `UPDATE public.tenants
        SET user_id = $1, status = 'active', updated_at = now()
      WHERE id = $2`,
    [userId, invitation.id],
  );
  return c.json({ data: { tenantId: invitation.id, claimed: true } });
});

app.get('/v1/me', async (c) => {
  const actor = getActor(c);
  if (actor.kind === 'landlord') {
    const profile = await one(
      `SELECT id, display_name, email, phone, address, bank_account, organization_id
         FROM public.landlord_profiles WHERE id = $1`,
      [actor.landlordId],
    );
    return c.json({ data: { role: 'landlord', profile } });
  }
  const tenant = await one(
    `SELECT t.id, t.name, t.email, t.status, p.name AS property_name, p.unit_number, t.monthly_rent
       FROM public.tenants t
       JOIN public.properties p ON p.id = t.property_id
      WHERE t.id = $1`,
    [actor.tenantId],
  );
  return c.json({ data: { role: 'tenant', profile: tenant } });
});

app.get('/v1/dashboard', async (c) => {
  const actor = getActor(c);
  if (actor.kind === 'tenant') {
    const [tenant, invoices, readings] = await Promise.all([
      one(
        `SELECT t.id, t.name, t.email, t.monthly_rent, p.name AS property_name, p.unit_number
           FROM public.tenants t JOIN public.properties p ON p.id = t.property_id
          WHERE t.id = $1`,
        [actor.tenantId],
      ),
      query(
        `SELECT id, period_start, period_end, due_date, total, status, created_at
           FROM public.invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 8`,
        [actor.tenantId],
      ),
      query(
        `SELECT id, reading_date, utility_type, current_reading, consumption, note
           FROM public.utility_readings WHERE tenant_id = $1
          ORDER BY reading_date DESC, created_at DESC LIMIT 6`,
        [actor.tenantId],
      ),
    ]);
    return c.json({ data: { role: 'tenant', tenant, invoices, readings } });
  }

  const landlordId = actor.landlordId;
  const [counts, properties, recentPayments, expenses] = await Promise.all([
    one(
      `SELECT
        (SELECT count(*)::int FROM public.properties WHERE landlord_id = $1) AS property_count,
        (SELECT count(*)::int FROM public.tenants WHERE landlord_id = $1 AND status = 'active') AS active_tenant_count,
        (SELECT coalesce(sum(amount), 0) FROM public.payments
          WHERE landlord_id = $1 AND date_trunc('month', payment_date) = date_trunc('month', current_date)) AS paid_this_month,
        (SELECT coalesce(sum(amount), 0) FROM public.expenses
          WHERE landlord_id = $1 AND date_trunc('month', expense_date) = date_trunc('month', current_date)) AS expenses_this_month`,
      [landlordId],
    ),
    query(
      `SELECT p.id, p.name, p.unit_number, p.monthly_rent, t.id AS tenant_id, t.name AS tenant_name, t.status AS tenant_status
         FROM public.properties p
         LEFT JOIN public.tenants t ON t.property_id = p.id AND t.status IN ('invited', 'active')
        WHERE p.landlord_id = $1 ORDER BY p.name`,
      [landlordId],
    ),
    query(
      `SELECT pay.id, pay.payment_date, pay.amount, pay.method, t.name AS tenant_name
         FROM public.payments pay JOIN public.tenants t ON t.id = pay.tenant_id
        WHERE pay.landlord_id = $1 ORDER BY pay.payment_date DESC LIMIT 6`,
      [landlordId],
    ),
    one<{ total: number }>(
      `SELECT coalesce(sum(amount), 0) AS total FROM public.expenses
        WHERE landlord_id = $1`,
      [landlordId],
    ),
  ]);
  return c.json({ data: { role: 'landlord', counts, properties, recentPayments, allTimeExpenses: expenses?.total ?? 0 } });
});

app.get('/v1/properties', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const properties = await query(
    `SELECT p.id, p.name, p.unit_number, p.monthly_rent, p.created_at, p.updated_at,
            t.id AS tenant_id, t.name AS tenant_name, t.status AS tenant_status
       FROM public.properties p
       LEFT JOIN public.tenants t ON t.property_id = p.id AND t.status IN ('invited', 'active')
      WHERE p.landlord_id = $1 ORDER BY p.name`,
    [landlord.landlordId],
  );
  return c.json({ data: properties });
});

app.post('/v1/properties', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(propertyInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const property = await one(
    `INSERT INTO public.properties (id, landlord_id, name, unit_number, monthly_rent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, unit_number, monthly_rent, created_at, updated_at`,
    [randomUUID(), landlord.landlordId, body.data.name, body.data.unitNumber ?? null, body.data.monthlyRent],
  );
  return c.json({ data: property }, 201);
});

app.patch('/v1/properties/:id', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const id = c.req.param('id');
  if (!uuid.safeParse(id).success) return c.json({ error: { message: 'Invalid property id.' } }, 400);
  const body = parsed(propertyInput.partial(), await c.req.json());
  if ('error' in body || Object.keys(body.data).length === 0) {
    const message = 'error' in body ? body.error.message : 'Provide at least one property field.';
    return c.json({ error: { message } }, 400);
  }
  const property = await one(
    `UPDATE public.properties
        SET name = coalesce($3, name), unit_number = coalesce($4, unit_number),
            monthly_rent = coalesce($5, monthly_rent), updated_at = now()
      WHERE id = $1 AND landlord_id = $2
      RETURNING id, name, unit_number, monthly_rent, created_at, updated_at`,
    [id, landlord.landlordId, body.data.name ?? null, body.data.unitNumber ?? null, body.data.monthlyRent ?? null],
  );
  if (!property) return c.json({ error: { message: 'Property not found.' } }, 404);
  return c.json({ data: property });
});

app.delete('/v1/properties/:id', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const property = await one<{ id: string }>(
    'DELETE FROM public.properties WHERE id = $1 AND landlord_id = $2 RETURNING id',
    [c.req.param('id'), landlord.landlordId],
  );
  if (!property) return c.json({ error: { message: 'Property not found or it still has tenant records.' } }, 404);
  return c.json({ data: { deleted: property.id } });
});

app.get('/v1/tenants', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const tenants = await query(
    `SELECT t.id, t.name, t.email, t.phone, t.monthly_rent, t.status, t.invitation_id, t.created_at,
            p.id AS property_id, p.name AS property_name, p.unit_number
       FROM public.tenants t JOIN public.properties p ON p.id = t.property_id
      WHERE t.landlord_id = $1 ORDER BY t.created_at DESC`,
    [landlord.landlordId],
  );
  return c.json({ data: tenants });
});

app.post('/v1/tenants', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(tenantInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const tenant = await one(
    `INSERT INTO public.tenants (id, landlord_id, property_id, name, email, phone, monthly_rent)
     SELECT $1, $2, p.id, $4, $5, $6, $7
       FROM public.properties p
      WHERE p.id = $3 AND p.landlord_id = $2
     RETURNING id, property_id, name, email, phone, monthly_rent, status`,
    [randomUUID(), landlord.landlordId, body.data.propertyId, body.data.name, body.data.email, body.data.phone ?? null, body.data.monthlyRent],
  );
  if (!tenant) return c.json({ error: { message: 'The selected property was not found.' } }, 404);
  return c.json({ data: tenant }, 201);
});

app.patch('/v1/tenants/:id', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(z.object({
    name: requiredText(2, 120).optional(),
    phone: optionalText(40),
    monthlyRent: money.optional(),
    status: z.enum(['invited', 'active', 'inactive']).optional(),
    invitationId: uuid.optional().nullable(),
  }), await c.req.json());
  if ('error' in body || Object.keys(body.data).length === 0) {
    const message = 'error' in body ? body.error.message : 'Provide at least one tenant field.';
    return c.json({ error: { message } }, 400);
  }
  const tenant = await one(
    `UPDATE public.tenants
        SET name = coalesce($3, name), phone = coalesce($4, phone), monthly_rent = coalesce($5, monthly_rent),
            status = coalesce($6, status), invitation_id = coalesce($7, invitation_id), updated_at = now()
      WHERE id = $1 AND landlord_id = $2
      RETURNING id, property_id, name, email, phone, monthly_rent, status, invitation_id`,
    [c.req.param('id'), landlord.landlordId, body.data.name ?? null, body.data.phone ?? null,
      body.data.monthlyRent ?? null, body.data.status ?? null, body.data.invitationId ?? null],
  );
  if (!tenant) return c.json({ error: { message: 'Tenant not found.' } }, 404);
  return c.json({ data: tenant });
});

app.get('/v1/rates', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const rates = await one(
    'SELECT electricity_rate, water_rate, updated_at FROM public.utility_rates WHERE landlord_id = $1',
    [landlord.landlordId],
  );
  return c.json({ data: rates });
});

app.put('/v1/rates', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(rateInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const rates = await one(
    `UPDATE public.utility_rates SET electricity_rate = $2, water_rate = $3, updated_at = now()
      WHERE landlord_id = $1 RETURNING electricity_rate, water_rate, updated_at`,
    [landlord.landlordId, body.data.electricityRate, body.data.waterRate],
  );
  return c.json({ data: rates });
});

app.get('/v1/readings', async (c) => {
  const actor = getActor(c);
  const tenantId = actor.kind === 'tenant' ? actor.tenantId : c.req.query('tenantId');
  if (actor.kind === 'landlord' && tenantId && !uuid.safeParse(tenantId).success) {
    return c.json({ error: { message: 'Invalid tenant id.' } }, 400);
  }
  const readings = await query(
    `SELECT r.id, r.tenant_id, r.reading_date, r.utility_type, r.previous_reading, r.current_reading, r.consumption, r.note,
            t.name AS tenant_name, p.name AS property_name
       FROM public.utility_readings r
       JOIN public.tenants t ON t.id = r.tenant_id
       JOIN public.properties p ON p.id = t.property_id
      WHERE r.landlord_id = $1
        AND ($2::uuid IS NULL OR r.tenant_id = $2)
      ORDER BY r.reading_date DESC, r.created_at DESC`,
    [actor.landlordId, tenantId ?? null],
  );
  return c.json({ data: readings });
});

app.post('/v1/readings', async (c) => {
  const actor = getActor(c);
  const body = parsed(readingInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const tenantId = actor.kind === 'tenant' ? actor.tenantId : body.data.tenantId;
  if (!tenantId) return c.json({ error: { message: 'A tenant is required for this reading.' } }, 400);

  const reading = await withTransaction(async (client) => {
    const tenant = await client.query<{ id: string }>(
      'SELECT id FROM public.tenants WHERE id = $1 AND landlord_id = $2 FOR UPDATE',
      [tenantId, actor.landlordId],
    );
    if (tenant.rowCount === 0) throw new ApiError(404, 'Tenant not found.');
    const previous = await client.query<{ current_reading: string }>(
      `SELECT current_reading FROM public.utility_readings
        WHERE tenant_id = $1 AND utility_type = $2
        ORDER BY reading_date DESC, created_at DESC LIMIT 1 FOR UPDATE`,
      [tenantId, body.data.utilityType],
    );
    const previousReading = Number(previous.rows[0]?.current_reading ?? 0);
    if (body.data.currentReading < previousReading) {
      throw new ApiError(400, `The reading cannot be lower than the previous reading (${previousReading}).`);
    }
    const result = await client.query(
      `INSERT INTO public.utility_readings
        (id, landlord_id, tenant_id, reading_date, utility_type, previous_reading, current_reading, consumption, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, reading_date, utility_type, previous_reading, current_reading, consumption, note, created_at`,
      [randomUUID(), actor.landlordId, tenantId, body.data.readingDate, body.data.utilityType,
        previousReading, body.data.currentReading, body.data.currentReading - previousReading, body.data.note ?? null],
    );
    return asJson(result.rows[0]);
  });
  return c.json({ data: reading }, 201);
});

app.get('/v1/payments', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const payments = await query(
    `SELECT p.id, p.tenant_id, p.payment_date, p.amount, p.method, p.note, p.created_at, t.name AS tenant_name
       FROM public.payments p JOIN public.tenants t ON t.id = p.tenant_id
      WHERE p.landlord_id = $1 ORDER BY p.payment_date DESC, p.created_at DESC`,
    [landlord.landlordId],
  );
  return c.json({ data: payments });
});

app.post('/v1/payments', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(paymentInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const payment = await one(
    `INSERT INTO public.payments (id, landlord_id, tenant_id, payment_date, amount, method, note)
     SELECT $1, $2, t.id, $4, $5, $6, $7 FROM public.tenants t
      WHERE t.id = $3 AND t.landlord_id = $2
     RETURNING id, tenant_id, payment_date, amount, method, note, created_at`,
    [randomUUID(), landlord.landlordId, body.data.tenantId, body.data.paymentDate, body.data.amount, body.data.method, body.data.note ?? null],
  );
  if (!payment) return c.json({ error: { message: 'Tenant not found.' } }, 404);
  return c.json({ data: payment }, 201);
});

app.get('/v1/invoices', async (c) => {
  const actor = getActor(c);
  const invoices = await query(
    `SELECT i.id, i.tenant_id, i.period_start, i.period_end, i.due_date, i.total, i.content, i.status, i.created_at,
            t.name AS tenant_name, p.name AS property_name
       FROM public.invoices i
       JOIN public.tenants t ON t.id = i.tenant_id
       JOIN public.properties p ON p.id = t.property_id
      WHERE i.landlord_id = $1
        AND ($2::uuid IS NULL OR i.tenant_id = $2)
      ORDER BY i.created_at DESC`,
    [actor.landlordId, actor.kind === 'tenant' ? actor.tenantId : null],
  );
  return c.json({ data: invoices });
});

app.post('/v1/invoices', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(invoiceInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  if (body.data.periodEnd < body.data.periodStart) {
    return c.json({ error: { message: 'The invoice period end must be on or after the start.' } }, 400);
  }

  const details = await one<{
    tenant_name: string; tenant_email: string; property_name: string; unit_number: string | null; monthly_rent: number;
    display_name: string; email: string; address: string | null; phone: string | null; bank_account: string | null;
    electricity_rate: number; water_rate: number; utility_total: number;
  }>(
    `SELECT t.name AS tenant_name, t.email AS tenant_email, p.name AS property_name, p.unit_number, t.monthly_rent,
            lp.display_name, lp.email, lp.address, lp.phone, lp.bank_account,
            r.electricity_rate, r.water_rate,
            coalesce(sum(CASE WHEN ur.utility_type = 'electricity' THEN ur.consumption * r.electricity_rate
                              WHEN ur.utility_type = 'water' THEN ur.consumption * r.water_rate ELSE 0 END), 0) AS utility_total
       FROM public.tenants t
       JOIN public.properties p ON p.id = t.property_id
       JOIN public.landlord_profiles lp ON lp.id = t.landlord_id
       JOIN public.utility_rates r ON r.landlord_id = lp.id
       LEFT JOIN public.utility_readings ur ON ur.tenant_id = t.id
            AND ur.reading_date BETWEEN $3 AND $4
      WHERE t.id = $1 AND t.landlord_id = $2
      GROUP BY t.name, t.email, p.name, p.unit_number, t.monthly_rent, lp.display_name, lp.email, lp.address, lp.phone,
               lp.bank_account, r.electricity_rate, r.water_rate`,
    [body.data.tenantId, landlord.landlordId, body.data.periodStart, body.data.periodEnd],
  );
  if (!details) return c.json({ error: { message: 'Tenant not found.' } }, 404);
  const utilityTotal = Number(details.utility_total);
  const total = Number(details.monthly_rent) + utilityTotal + body.data.additionalAmount;
  const content = [
    `KP-Rents Invoice`,
    `Issued by: ${details.display_name}`,
    `Tenant: ${details.tenant_name}`,
    `Property: ${details.property_name}${details.unit_number ? ` (${details.unit_number})` : ''}`,
    `Billing period: ${body.data.periodStart} to ${body.data.periodEnd}`,
    `Due date: ${body.data.dueDate}`,
    '',
    `Rent: R ${Number(details.monthly_rent).toFixed(2)}`,
    `Utilities: R ${utilityTotal.toFixed(2)}`,
    `Additional charges: R ${body.data.additionalAmount.toFixed(2)}`,
    `TOTAL DUE: R ${total.toFixed(2)}`,
    ...(body.data.additionalNote ? ['', `Note: ${body.data.additionalNote}`] : []),
    '',
    `Contact: ${details.email}${details.phone ? ` | ${details.phone}` : ''}`,
    ...(details.address ? [details.address] : []),
    ...(details.bank_account ? [`Payment details: ${details.bank_account}`] : []),
  ].join('\n');
  const invoice = await one(
    `INSERT INTO public.invoices (id, landlord_id, tenant_id, period_start, period_end, due_date, total, content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, tenant_id, period_start, period_end, due_date, total, content, status, created_at`,
    [randomUUID(), landlord.landlordId, body.data.tenantId, body.data.periodStart, body.data.periodEnd,
      body.data.dueDate, total, content],
  );
  return c.json({ data: invoice }, 201);
});

app.get('/v1/messages', async (c) => {
  const actor = getActor(c);
  const messages = await query(
    `SELECT m.id, m.tenant_id, m.parent_message_id, m.sender_role, m.subject, m.body, m.resolved, m.created_at,
            t.name AS tenant_name, p.name AS property_name
       FROM public.messages m
       JOIN public.tenants t ON t.id = m.tenant_id
       JOIN public.properties p ON p.id = t.property_id
      WHERE m.landlord_id = $1
        AND ($2::uuid IS NULL OR m.tenant_id = $2)
      ORDER BY m.created_at ASC`,
    [actor.landlordId, actor.kind === 'tenant' ? actor.tenantId : null],
  );
  return c.json({ data: messages });
});

app.post('/v1/messages', async (c) => {
  const actor = getActor(c);
  const body = parsed(messageInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const tenantId = actor.kind === 'tenant' ? actor.tenantId : body.data.tenantId;
  if (!tenantId) return c.json({ error: { message: 'A tenant is required for this message.' } }, 400);
  const message = await one(
    `INSERT INTO public.messages (id, landlord_id, tenant_id, parent_message_id, sender_role, subject, body)
     SELECT $1, $2, t.id, $4, $5, $6, $7 FROM public.tenants t
      WHERE t.id = $3 AND t.landlord_id = $2
     RETURNING id, tenant_id, parent_message_id, sender_role, subject, body, resolved, created_at`,
    [randomUUID(), actor.landlordId, tenantId, body.data.parentMessageId ?? null, actor.kind,
      body.data.subject, body.data.body],
  );
  if (!message) return c.json({ error: { message: 'Tenant not found.' } }, 404);
  return c.json({ data: message }, 201);
});

app.patch('/v1/messages/:id/resolution', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(z.object({ resolved: z.boolean() }), await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const message = await one(
    `UPDATE public.messages SET resolved = $3
      WHERE id = $1 AND landlord_id = $2 RETURNING id, resolved`,
    [c.req.param('id'), landlord.landlordId, body.data.resolved],
  );
  if (!message) return c.json({ error: { message: 'Message not found.' } }, 404);
  return c.json({ data: message });
});

app.get('/v1/expenses', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const expenses = await query(
    `SELECT e.id, e.property_id, e.category, e.amount, e.expense_date, e.description, e.created_at, p.name AS property_name
       FROM public.expenses e LEFT JOIN public.properties p ON p.id = e.property_id
      WHERE e.landlord_id = $1 ORDER BY e.expense_date DESC, e.created_at DESC`,
    [landlord.landlordId],
  );
  return c.json({ data: expenses });
});

app.post('/v1/expenses', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(expenseInput, await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  if (body.data.propertyId) {
    const ownProperty = await one<{ id: string }>('SELECT id FROM public.properties WHERE id = $1 AND landlord_id = $2', [body.data.propertyId, landlord.landlordId]);
    if (!ownProperty) return c.json({ error: { message: 'Property not found.' } }, 404);
  }
  const expense = await one(
    `INSERT INTO public.expenses (id, landlord_id, property_id, category, amount, expense_date, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, property_id, category, amount, expense_date, description, created_at`,
    [randomUUID(), landlord.landlordId, body.data.propertyId ?? null, body.data.category, body.data.amount,
      body.data.expenseDate, body.data.description ?? null],
  );
  return c.json({ data: expense }, 201);
});

app.delete('/v1/expenses/:id', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const expense = await one<{ id: string }>(
    'DELETE FROM public.expenses WHERE id = $1 AND landlord_id = $2 RETURNING id',
    [c.req.param('id'), landlord.landlordId],
  );
  if (!expense) return c.json({ error: { message: 'Expense not found.' } }, 404);
  return c.json({ data: { deleted: expense.id } });
});

app.get('/v1/categories', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const categories = await query(
    `SELECT id, name, icon, is_default FROM public.expense_categories
      WHERE landlord_id = $1 ORDER BY is_default DESC, name`,
    [landlord.landlordId],
  );
  return c.json({ data: categories });
});

app.post('/v1/categories', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(z.object({ name: requiredText(2, 80), icon: requiredText(1, 12).optional() }), await c.req.json());
  if ('error' in body) return c.json({ error: body.error }, body.status as 400);
  const category = await one(
    `INSERT INTO public.expense_categories (id, landlord_id, name, icon)
     VALUES ($1, $2, $3, $4) RETURNING id, name, icon, is_default`,
    [randomUUID(), landlord.landlordId, body.data.name, body.data.icon ?? '•'],
  );
  return c.json({ data: category }, 201);
});

app.get('/v1/settings', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const settings = await one(
    `SELECT display_name, email, phone, address, bank_account, created_at, updated_at
       FROM public.landlord_profiles WHERE id = $1`,
    [landlord.landlordId],
  );
  return c.json({ data: settings });
});

app.patch('/v1/settings', async (c) => {
  const landlord = landlordOnly(getActor(c));
  const body = parsed(z.object({
    displayName: requiredText(2, 120).optional(),
    phone: optionalText(40),
    address: optionalText(500),
    bankAccount: optionalText(500),
  }), await c.req.json());
  if ('error' in body || Object.keys(body.data).length === 0) {
    const message = 'error' in body ? body.error.message : 'Provide at least one settings field.';
    return c.json({ error: { message } }, 400);
  }
  const settings = await one(
    `UPDATE public.landlord_profiles
        SET display_name = coalesce($2, display_name), phone = coalesce($3, phone),
            address = coalesce($4, address), bank_account = coalesce($5, bank_account), updated_at = now()
      WHERE id = $1
      RETURNING display_name, email, phone, address, bank_account, updated_at`,
    [landlord.landlordId, body.data.displayName ?? null, body.data.phone ?? null,
      body.data.address ?? null, body.data.bankAccount ?? null],
  );
  return c.json({ data: settings });
});

app.onError((error, c) => {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof ApiError ? error.message : 'An unexpected server error occurred.';
  if (status >= 500) console.error(error);
  return c.json({ error: { message } }, status as 400 | 401 | 403 | 404 | 500);
});

export default app;
