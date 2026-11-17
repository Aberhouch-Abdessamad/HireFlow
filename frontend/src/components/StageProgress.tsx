interface StageProgressProps {
  stages: readonly { id: number; name: string }[];
  currentId: number | undefined;
  /** Rejected applications show the reached stage in red. */
  state: 'active' | 'rejected' | 'hired' | 'withdrawn';
}

/** Horizontal stage tracker: completed stages filled, current highlighted. */
export function StageProgress({ stages, currentId, state }: StageProgressProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentId);
  return (
    <ol
      className="m-0 flex list-none gap-1.5 overflow-x-auto p-0"
      aria-label="Application progress"
    >
      {stages.map((stage, index) => {
        const done = index < currentIndex || (state === 'hired' && index <= currentIndex);
        const current = index === currentIndex && state !== 'hired';
        const bar = done
          ? 'bg-primary'
          : current
            ? state === 'rejected'
              ? 'bg-rose-500'
              : state === 'withdrawn'
                ? 'bg-slate-400'
                : 'bg-primary'
            : 'bg-slate-200';
        return (
          <li
            key={stage.id}
            className="min-w-[96px] flex-1"
            aria-current={current ? 'step' : undefined}
          >
            <div
              className={`h-1.5 rounded-full ${bar} ${current ? 'ring-4 ring-indigo-50' : ''}`}
            />
            <div
              className={`mt-2 truncate text-xs ${
                current
                  ? 'font-semibold text-slate-900'
                  : done
                    ? 'font-medium text-slate-600'
                    : 'text-slate-400'
              }`}
            >
              {stage.name}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
