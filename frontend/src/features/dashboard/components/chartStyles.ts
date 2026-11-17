/** Recessive axis styling shared by all charts. */
export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: '#94A3B8', fontSize: 12 },
} as const;

/** "2026-10" → "Oct 2026" for chart axes. */
export function monthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
