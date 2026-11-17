interface TooltipEntry {
  name?: string | number;
  value?: string | number | ReadonlyArray<string | number>;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
  /** Appended to each value, e.g. " days". */
  unit?: string;
}

/** Recharts tooltip in the HireFlow surface style (values in text ink, swatch for identity). */
export function ChartTooltip({ active, label, payload, unit = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] shadow-[var(--shadow-lift)]">
      {label !== undefined ? (
        <div className="mb-1.5 font-semibold text-slate-900">{label}</div>
      ) : null}
      {payload.map((entry) => (
        <div
          key={String(entry.dataKey ?? entry.name)}
          className="flex items-center justify-between gap-4 py-0.5"
        >
          <span className="flex items-center gap-2 text-slate-500 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {entry.value ?? '—'}
            {entry.value !== undefined && entry.value !== null ? unit : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Legend row rendered in HTML, so labels use text ink rather than series colours. */
export function ChartLegend({ items }: { items: readonly { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
