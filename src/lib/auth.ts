import { createAuthClient } from '@neondatabase/neon-js/auth';
import { runtimeConfig } from './config';

export const authClient = createAuthClient(runtimeConfig.authUrl);

export async function getAccessToken() {
  // Neon Auth attaches the signed JWT to the session returned by getSession().
  // `token()` is a different Better Auth endpoint and does not provide the JWT
  // required by the protected KP-Rents Function after an email-OTP verification.
  const result: any = await authClient.getSession();
  if (result.error) throw new Error(result.error.message);
  const token = result.data?.session?.token;
  if (!token) throw new Error('Your sign-in session has expired. Please sign in again.');
  return token;
}

export function makeOrganizationSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42) || 'kp-rents';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function getOrCreateLandlordOrganization(displayName: string) {
  const name = `${displayName.trim()} — KP-Rents`;
  const organizations: any = await authClient.organization.list();
  if (organizations.error) throw new Error(organizations.error.message);

  // A previous attempt can create the organization before the protected
  // profile request completes. Reuse that workspace instead of creating a
  // duplicate when the landlord retries the setup action.
  const existing = organizations.data?.find((organization: { id: string; name: string }) => organization.name === name);
  if (existing?.id) return existing.id;

  const created: any = await authClient.organization.create({
    name,
    slug: makeOrganizationSlug(displayName),
  });
  if (created.error) throw new Error(created.error.message);
  if (!created.data?.id) throw new Error('Neon Auth did not return an organization id.');
  return created.data.id as string;
}
