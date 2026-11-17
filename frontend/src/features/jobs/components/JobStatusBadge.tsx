import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { JOB_STATUS_LABELS, type JobStatus } from '../types';

const TONES: Record<JobStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  paused: 'warning',
  closed: 'danger',
  archived: 'muted',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <StatusBadge label={JOB_STATUS_LABELS[status]} tone={TONES[status]} />;
}
