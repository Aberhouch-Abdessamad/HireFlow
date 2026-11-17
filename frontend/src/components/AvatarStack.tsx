import { Tooltip } from 'antd';
import { UserAvatar } from './UserAvatar';

interface AvatarStackProps {
  people: readonly { id: number | string; name: string }[];
  max?: number;
  emptyLabel?: string;
}

/** Overlapping initials avatars with a "+N" overflow; names are shown on hover. */
export function AvatarStack({ people, max = 3, emptyLabel = 'Unassigned' }: AvatarStackProps) {
  if (people.length === 0) return <span className="text-[13px] text-slate-400">{emptyLabel}</span>;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <Tooltip title={people.map((person) => person.name).join(', ')}>
      <span className="inline-flex items-center" aria-label={people.map((p) => p.name).join(', ')}>
        {shown.map((person, index) => (
          <UserAvatar
            key={person.id}
            name={person.name}
            size="sm"
            className={`ring-2 ring-white ${index > 0 ? '-ml-2' : ''}`}
          />
        ))}
        {rest > 0 ? (
          <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
            +{rest}
          </span>
        ) : null}
        {people.length === 1 ? (
          <span className="ml-2 truncate text-[13px] text-slate-700">{people[0]?.name}</span>
        ) : null}
      </span>
    </Tooltip>
  );
}
