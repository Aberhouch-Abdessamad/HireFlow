import type { StageType } from '../types';

/** Accent per stage type, used for board column markers and stage pills. */
export const STAGE_ACCENT: Record<string, { dot: string; bar: string }> = {
  applied: { dot: 'bg-slate-400', bar: 'bg-slate-300' },
  screening: { dot: 'bg-sky-500', bar: 'bg-sky-400' },
  shortlist: { dot: 'bg-indigo-500', bar: 'bg-indigo-400' },
  interview: { dot: 'bg-violet-500', bar: 'bg-violet-400' },
  assessment: { dot: 'bg-amber-500', bar: 'bg-amber-400' },
  offer: { dot: 'bg-pink-500', bar: 'bg-pink-400' },
  hired: { dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
  custom: { dot: 'bg-teal-500', bar: 'bg-teal-400' },
};

export function stageAccent(type: StageType | string | undefined) {
  return STAGE_ACCENT[type ?? 'custom'] ?? { dot: 'bg-teal-500', bar: 'bg-teal-400' };
}
