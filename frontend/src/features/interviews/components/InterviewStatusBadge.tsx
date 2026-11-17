import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import type { InterviewStatus } from '../types';

const UI: Record<InterviewStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Scheduled', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <StatusBadge label={UI[status].label} tone={UI[status].tone} />;
}
