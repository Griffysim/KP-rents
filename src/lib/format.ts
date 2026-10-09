export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value ?? 0));

export const date = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—';

export const today = () => new Date().toISOString().slice(0, 10);
