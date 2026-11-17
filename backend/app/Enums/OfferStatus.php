<?php

namespace App\Enums;

/**
 * Offer workflow (with the approval step agreed in the Phase 1 decisions):
 *
 *   Draft ──submit──► PendingApproval ──approve──► Approved ──send──► Sent ──► Accepted | Rejected | Expired
 *     ▲                     │
 *     └──── return ─────────┘          Draft/PendingApproval/Approved/Sent ──withdraw──► Withdrawn
 */
enum OfferStatus: string
{
    case Draft = 'draft';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case Sent = 'sent';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Expired = 'expired';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::PendingApproval => 'Pending approval',
            default => ucfirst($this->value),
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Draft, self::PendingApproval, self::Approved, self::Sent], true);
    }

    public function isEditable(): bool
    {
        return $this === self::Draft;
    }
}
