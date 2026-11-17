import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  /** Removes body padding, e.g. for tables and lists that run edge to edge. */
  flush?: boolean;
  className?: string;
}

/** White panel with an optional header row; the building block of detail pages. */
export function SectionCard({
  title,
  description,
  extra,
  children,
  flush = false,
  className = '',
}: SectionCardProps) {
  return (
    <section className={`hf-surface overflow-hidden ${className}`}>
      {title || extra ? (
        <div className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="m-0 text-base font-bold text-slate-900">{title}</h2> : null}
            {description ? (
              <div className="mt-0.5 text-[13px] text-slate-500">{description}</div>
            ) : null}
          </div>
          {extra ? <div className="flex shrink-0 items-center gap-2">{extra}</div> : null}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
