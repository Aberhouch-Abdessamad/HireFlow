<?php

namespace App\Notifications;

use App\Models\Offer;

/** Sent to users who can approve offers when a draft offer is submitted for approval. */
final class OfferSubmittedForApprovalNotification extends CompanyNotification
{
    public function __construct(public readonly Offer $offer) {}

    public function type(): string
    {
        return 'offer.submitted_for_approval';
    }

    public function title(): string
    {
        return 'Offer awaiting approval';
    }

    public function message(): string
    {
        return sprintf(
            'An offer for %s (%s) is awaiting your approval.',
            $this->offer->application->candidate->full_name,
            $this->offer->application->jobPosting->title,
        );
    }

    public function link(): string
    {
        return '/offers/'.$this->offer->id;
    }
}
