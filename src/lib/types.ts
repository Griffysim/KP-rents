export type Role = 'landlord' | 'tenant';

export type LandlordProfile = {
  id: string;
  display_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  bank_account?: string | null;
  organization_id: string;
};

export type TenantProfile = {
  id: string;
  name: string;
  email: string;
  monthly_rent: number;
  property_name: string;
  unit_number?: string | null;
};

export type Me =
  | { role: 'landlord'; profile: LandlordProfile }
  | { role: 'tenant'; profile: TenantProfile };

export type Property = {
  id: string;
  name: string;
  unit_number?: string | null;
  monthly_rent: number;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_status?: 'invited' | 'active' | 'inactive' | null;
};

export type Tenant = {
  id: string;
  property_id: string;
  property_name: string;
  unit_number?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  monthly_rent: number;
  status: 'invited' | 'active' | 'inactive';
  invitation_id?: string | null;
};

export type Reading = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  property_name?: string;
  reading_date: string;
  utility_type: 'electricity' | 'water';
  previous_reading: number;
  current_reading: number;
  consumption: number;
  note?: string | null;
};

export type Payment = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  payment_date: string;
  amount: number;
  method: string;
  note?: string | null;
};

export type Invoice = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  property_name?: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total: number;
  content: string;
  status: string;
  created_at: string;
};

export type Message = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  property_name?: string;
  parent_message_id?: string | null;
  sender_role: Role;
  subject: string;
  body: string;
  resolved: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  property_id?: string | null;
  property_name?: string | null;
  category: string;
  amount: number;
  expense_date: string;
  description?: string | null;
};
