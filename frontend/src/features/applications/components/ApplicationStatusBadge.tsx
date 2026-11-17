import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '../types';

const TONES: Record<ApplicationStatus, StatusTone> = {
  active: 'info',
  rejected: 'danger',
  withdrawn: 'muted',
  hired: 'success',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <StatusBadge label={APPLICATION_STATUS_LABELS[status]} tone={TONES[status]} />;
}
