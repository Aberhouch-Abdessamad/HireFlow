import { Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface MetricItem {
  label: string;
  value: ReactNode;
  suffix?: string;
  /** One short line of context under the number. */
  hint?: ReactNode;
  /** Draws the number in the warning colour (something needs action). */
  attention?: boolean;
  to?: string;
}

/** A single bordered strip of headline numbers, separated by hairlines. */
export function MetricStrip({
  items,
  loading = false,
}: {
  items: MetricItem[];
  loading?: boolean;
}) {
  return (
    <section
      aria-label="Key figures"
      className="grid grid-cols-2 overflow-hidden rounded-xl border border-border md:grid-cols-4"
    >
      {items.map((item, index) => {
        const body = (
          <>
            <div className="text-[13px] font-medium text-slate-500">{item.label}</div>
            {loading ? (
              <Skeleton.Input active size="small" className="!mt-3" style={{ width: 72 }} />
            ) : (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-[34px] leading-none font-semibold tracking-tight tabular-nums ${
                    item.attention ? 'text-amber-700' : 'text-slate-900'
                  }`}
                >
                  {item.value}
                </span>
                {item.suffix ? (
                  <span className="text-sm font-medium text-slate-400">{item.suffix}</span>
                ) : null}
              </div>
            )}
            {item.hint ? <div className="mt-2 text-xs text-slate-500">{item.hint}</div> : null}
          </>
        );
        const cell = `block px-6 py-5 ${index % 2 === 1 ? 'border-l border-border' : ''} ${
          index >= 2 ? 'border-t border-border md:border-t-0' : ''
        } ${index >= 1 ? 'md:border-l md:border-border' : ''}`;
        return item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className={`${cell} !text-inherit !no-underline transition-colors hover:bg-slate-50`}
          >
            {body}
          </Link>
        ) : (
          <div key={item.label} className={cell}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

interface BlockProps {
  title: string;
  description?: ReactNode;
  action?: { to: string; label: string };
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Content without the bordered panel (e.g. a chart that sits on the page). */
  bare?: boolean;
}

/** Dashboard section: a heading row above a bordered panel. */
export function Block({
  title,
  description,
  action,
  extra,
  children,
  className = '',
  bare = false,
}: BlockProps) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 mb-0 text-[13px] text-slate-500">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {extra}
          {action ? (
            <Link to={action.to} className="text-[13px] font-semibold">
              {action.label} →
            </Link>
          ) : null}
        </div>
      </div>
      {bare ? (
        children
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">{children}</div>
      )}
    </section>
  );
}

/** A quiet one-line message for empty panels. */
export function Quiet({ children }: { children: ReactNode }) {
  return <div className="px-5 py-8 text-center text-[13px] text-slate-500">{children}</div>;
}

/** Row inside a Block list: left content, right meta, whole row links somewhere. */
export function Row({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li className="border-t border-border first:border-t-0">
      <Link
        to={to}
        className="flex items-center gap-4 px-5 py-3.5 !text-inherit !no-underline transition-colors hover:bg-slate-50"
      >
        {children}
      </Link>
    </li>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-5">
      <Skeleton active title={false} paragraph={{ rows }} />
    </div>
  );
}
