import dayjs from 'dayjs';

export function formatDate(value: string | null | undefined, fallback = '—'): string {
  return value ? dayjs(value).format('MMM D, YYYY') : fallback;
}

export function formatSalary(
  salary: { min: number | null; max: number | null; currency: string | null } | null | undefined,
): string | null {
  if (!salary || !salary.currency || (salary.min === null && salary.max === null)) return null;
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency ?? 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  if (salary.min !== null && salary.max !== null)
    return `${format(salary.min)} – ${format(salary.max)}`;
  if (salary.min !== null) return `From ${format(salary.min)}`;
  return `Up to ${format(salary.max ?? 0)}`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
