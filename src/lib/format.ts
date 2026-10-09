export const money = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number.isFinite(amount) ? amount : 0);
};

export const date = (value: string | null | undefined) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(parsed);
};

export const today = () => new Date().toISOString().slice(0, 10);
