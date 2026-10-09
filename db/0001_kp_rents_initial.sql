-- KP-Rents application schema for Neon Postgres.
-- Managed Better Auth owns the neon_auth schema; this migration creates only application tables.

CREATE TABLE public.landlord_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL UNIQUE REFERENCES neon_auth.organization(id) ON DELETE RESTRICT,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (position('@' IN email) > 1),
  phone text,
  address text,
  bank_account text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 160),
  unit_number text,
  monthly_rent numeric(12,2) NOT NULL CHECK (monthly_rent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX properties_landlord_id_idx ON public.properties(landlord_id);

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  user_id uuid UNIQUE REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (position('@' IN email) > 1),
  phone text,
  monthly_rent numeric(12,2) NOT NULL CHECK (monthly_rent >= 0),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  invitation_id uuid UNIQUE REFERENCES neon_auth.invitation(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, landlord_id)
);

CREATE INDEX tenants_landlord_id_idx ON public.tenants(landlord_id);
CREATE INDEX tenants_property_id_idx ON public.tenants(property_id);
CREATE UNIQUE INDEX tenants_landlord_email_ci_idx ON public.tenants(landlord_id, lower(email));
CREATE UNIQUE INDEX one_current_tenant_per_property_idx
  ON public.tenants(property_id)
  WHERE status IN ('invited', 'active');

CREATE TABLE public.utility_rates (
  landlord_id uuid PRIMARY KEY REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  electricity_rate numeric(12,4) NOT NULL DEFAULT 0.1500 CHECK (electricity_rate >= 0),
  water_rate numeric(12,4) NOT NULL DEFAULT 8.5000 CHECK (water_rate >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.utility_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reading_date date NOT NULL,
  utility_type text NOT NULL CHECK (utility_type IN ('electricity', 'water')),
  previous_reading numeric(14,2) NOT NULL CHECK (previous_reading >= 0),
  current_reading numeric(14,2) NOT NULL CHECK (current_reading >= previous_reading),
  consumption numeric(14,2) NOT NULL CHECK (consumption >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX utility_readings_tenant_type_date_idx
  ON public.utility_readings(tenant_id, utility_type, reading_date DESC, created_at DESC);
CREATE INDEX utility_readings_landlord_date_idx ON public.utility_readings(landlord_id, reading_date DESC);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  payment_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('bank_transfer', 'cash', 'card', 'other')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_tenant_date_idx ON public.payments(tenant_id, payment_date DESC);
CREATE INDEX payments_landlord_date_idx ON public.payments(landlord_id, payment_date DESC);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end >= period_start),
  due_date date NOT NULL,
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  content text NOT NULL CHECK (char_length(content) > 0),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoices_tenant_created_idx ON public.invoices(tenant_id, created_at DESC);
CREATE INDEX invoices_landlord_created_idx ON public.invoices(landlord_id, created_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('landlord', 'tenant')),
  subject text NOT NULL CHECK (char_length(trim(subject)) BETWEEN 2 AND 200),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_landlord_created_idx ON public.messages(landlord_id, created_at DESC);
CREATE INDEX messages_tenant_created_idx ON public.messages(tenant_id, created_at DESC);
CREATE INDEX messages_parent_idx ON public.messages(parent_message_id);

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  icon text NOT NULL DEFAULT '•',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (landlord_id, name)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlord_profiles(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (char_length(trim(category)) BETWEEN 2 AND 80),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  expense_date date NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expenses_landlord_date_idx ON public.expenses(landlord_id, expense_date DESC);
CREATE INDEX expenses_property_id_idx ON public.expenses(property_id);
