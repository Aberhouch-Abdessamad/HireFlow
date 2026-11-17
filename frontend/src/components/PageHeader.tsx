import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small label above the title, e.g. the section name. */
  eyebrow?: ReactNode;
  /** Renders a "back" link above the title. */
  back?: { to: string; label: string };
  /** Extra content under the description (status badges, meta). */
  meta?: ReactNode;
}

export function PageHeader({ title, description, actions, eyebrow, back, meta }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            to={back.to}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium !text-slate-500 hover:!text-primary"
          >
            <ArrowLeftOutlined className="text-[11px]" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? (
          <div className="mb-1 text-xs font-bold tracking-wider text-slate-500 uppercase">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="m-0 truncate text-[28px] leading-tight font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1.5 mb-0 text-sm text-slate-500">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
