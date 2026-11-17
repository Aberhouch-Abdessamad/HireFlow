import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface TimelineEntry {
  id: number | string;
  title: ReactNode;
  description?: ReactNode;
  actor?: string | null;
  at: string | null;
  color?: 'blue' | 'green' | 'red' | 'gray' | 'orange';
}

const DOTS: Record<NonNullable<TimelineEntry['color']>, string> = {
  blue: 'bg-indigo-500 ring-indigo-100',
  green: 'bg-emerald-500 ring-emerald-100',
  red: 'bg-rose-500 ring-rose-100',
  gray: 'bg-slate-400 ring-slate-100',
  orange: 'bg-amber-500 ring-amber-100',
};

/** Chronological activity list (newest first), used for application history and audit trails. */
export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState compact title="No activity yet" />;
  }

  return (
    <ol className="relative m-0 list-none p-0">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < entries.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-4 bottom-0 left-[5px] w-px bg-slate-200"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ${DOTS[entry.color ?? 'blue']}`}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">{entry.title}</div>
            {entry.description ? (
              <div className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[13px] whitespace-pre-line text-slate-600">
                {entry.description}
              </div>
            ) : null}
            <div className="mt-1 text-xs text-slate-400">
              {[entry.actor, entry.at ? dayjs(entry.at).format('MMM D, YYYY · HH:mm') : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
