import { initials } from '@/utils/initials';

const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
];

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length] ?? 'bg-slate-100 text-slate-700';
}

interface UserAvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Initials avatar with a stable colour derived from the name. */
export function UserAvatar({ name, size = 'sm', className = '' }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${SIZES[size]} ${colorFor(name)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
