import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { PROGRESS_LABELS, type Progress } from '../types';

const TONES: Record<Progress, StatusTone> = {
  received: 'neutral',
  in_review: 'info',
  interviewing: 'info',
  offer: 'warning',
  hired: 'success',
  not_selected: 'muted',
  withdrawn: 'muted',
};

export function ProgressTag({ progress }: { progress: Progress }) {
  return <StatusBadge label={PROGRESS_LABELS[progress]} tone={TONES[progress]} />;
}
