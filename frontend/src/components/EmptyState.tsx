import { InboxOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** Tighter spacing for use inside cards and panels. */
  compact?: boolean;
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-14'}`}
    >
      <div
        className={`mb-3 flex items-center justify-center rounded-2xl bg-primary-soft text-primary ring-8 ring-indigo-50/50 ${compact ? 'h-10 w-10 text-lg' : 'h-12 w-12 text-xl'}`}
      >
        {icon ?? <InboxOutlined />}
      </div>
      <div className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-[15px]'}`}>
        {title}
      </div>
      {description ? (
        <div className="mt-1 max-w-sm text-sm text-slate-500">{description}</div>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
