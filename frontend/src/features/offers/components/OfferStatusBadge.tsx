import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { OFFER_STATUS_LABELS, type OfferStatus } from '../types';

const TONES: Record<OfferStatus, StatusTone> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'info',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
  withdrawn: 'muted',
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <StatusBadge label={OFFER_STATUS_LABELS[status]} tone={TONES[status]} />;
}
