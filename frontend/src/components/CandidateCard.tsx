import type { ReactNode } from 'react';
import { UserAvatar } from './UserAvatar';

interface CandidateCardProps {
  name: string;
  subtitle?: string | null;
  meta?: ReactNode;
  size?: 'small' | 'default' | 'large';
}

const AVATAR = { small: 'sm', default: 'md', large: 'lg' } as const;

/** Compact person block (avatar initials + name + subtitle) used in lists, boards and headers. */
export function CandidateCard({ name, subtitle, meta, size = 'default' }: CandidateCardProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar name={name} size={AVATAR[size]} />
      <div className="min-w-0 leading-tight">
        <span
          className={`block truncate font-semibold text-slate-900 ${size === 'large' ? 'text-base' : 'text-sm'}`}
        >
          {name}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[13px] text-slate-500">{subtitle}</span>
        ) : null}
        {meta ? <div className="mt-1 text-xs text-slate-500">{meta}</div> : null}
      </div>
    </div>
  );
}
