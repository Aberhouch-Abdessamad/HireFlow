import { Skeleton } from 'antd';
import type { ReactNode } from 'react';

type Accent = 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

const ACCENTS: Record<Accent, string> = {
  indigo: 'bg-primary-soft text-primary',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  /** Short context under the value, e.g. "in the selected period". */
  hint?: ReactNode;
  suffix?: ReactNode;
  loading?: boolean;
}

/** KPI tile: label, large value, optional icon and hint. */
export function StatCard({
  label,
  value,
  icon,
  accent = 'indigo',
  hint,
  suffix,
  loading = false,
}: StatCardProps) {
  return (
    <div className="hf-surface flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        {icon ? (
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] ${ACCENTS[accent]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 80 }} />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[30px] leading-none font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </span>
          {suffix ? <span className="text-sm font-medium text-slate-400">{suffix}</span> : null}
        </div>
      )}
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}
