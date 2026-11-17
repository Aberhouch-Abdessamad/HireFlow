export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted';

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  info: { pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
  success: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  warning: { pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  danger: { pill: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  muted: { pill: 'bg-white text-slate-500 ring-slate-200', dot: 'bg-slate-300' },
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

/** Consistent status pill used across jobs, applications, interviews and offers. */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const style = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap ring-1 ring-inset ${style.pill}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
