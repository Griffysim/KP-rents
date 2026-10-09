import { getAccessToken } from './auth';
import { runtimeConfig } from './config';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!runtimeConfig.apiUrl) {
    throw new ApiError(503, 'The KP-Rents API URL is not configured. Set VITE_KP_RENTS_API_URL after deploying the Neon Function.');
  }
  const token = await getAccessToken();
  const response = await fetch(`${runtimeConfig.apiUrl}/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new ApiError(response.status, payload.error?.message ?? 'The request failed.');
  return payload.data as T;
}

export const api = {
  me: () => request<unknown>('/me'),
  dashboard: () => request<unknown>('/dashboard'),
  bootstrapLandlord: (body: { displayName: string; organizationId: string }) => request('/bootstrap/landlord', { method: 'POST', body: JSON.stringify(body) }),
  claimTenant: () => request('/tenant/claim', { method: 'POST' }),
  listProperties: () => request<unknown[]>('/properties'),
  createProperty: (body: unknown) => request('/properties', { method: 'POST', body: JSON.stringify(body) }),
  updateProperty: (id: string, body: unknown) => request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProperty: (id: string) => request(`/properties/${id}`, { method: 'DELETE' }),
  listTenants: () => request<unknown[]>('/tenants'),
  createTenant: (body: unknown) => request<{ id: string; email: string }>('/tenants', { method: 'POST', body: JSON.stringify(body) }),
  updateTenant: (id: string, body: unknown) => request(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  rates: () => request<unknown>('/rates'),
  updateRates: (body: unknown) => request('/rates', { method: 'PUT', body: JSON.stringify(body) }),
  readings: (tenantId?: string) => request<unknown[]>(`/readings${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`),
  createReading: (body: unknown) => request('/readings', { method: 'POST', body: JSON.stringify(body) }),
  payments: () => request<unknown[]>('/payments'),
  createPayment: (body: unknown) => request('/payments', { method: 'POST', body: JSON.stringify(body) }),
  invoices: () => request<unknown[]>('/invoices'),
  createInvoice: (body: unknown) => request('/invoices', { method: 'POST', body: JSON.stringify(body) }),
  invoiceCoverNote: (id: string) => request<{ content: string; model: string }>(`/invoices/${id}/ai-cover-note`, { method: 'POST' }),
  messages: () => request<unknown[]>('/messages'),
  createMessage: (body: unknown) => request('/messages', { method: 'POST', body: JSON.stringify(body) }),
  resolveMessage: (id: string, resolved: boolean) => request(`/messages/${id}/resolution`, { method: 'PATCH', body: JSON.stringify({ resolved }) }),
  expenses: () => request<unknown[]>('/expenses'),
  createExpense: (body: unknown) => request('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),
  categories: () => request<unknown[]>('/categories'),
  createCategory: (body: unknown) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  settings: () => request<unknown>('/settings'),
  updateSettings: (body: unknown) => request('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  reportSummary: () => request<unknown>('/reports/summary'),
  aiSettings: () => request<unknown>('/ai/settings'),
  updateAiSettings: (body: { model: string | null }) => request('/ai/settings', { method: 'PUT', body: JSON.stringify(body) }),
  aiModels: () => request<unknown[]>('/ai/models'),
  generateAiReport: (body: { focus: string }) => request<{ content: string; model: string }>('/ai/reports', { method: 'POST', body: JSON.stringify(body) }),
};
