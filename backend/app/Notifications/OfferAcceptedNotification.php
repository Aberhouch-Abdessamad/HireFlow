<?php

namespace App\Notifications;

use App\Models\Offer;

/** Sent to the offer's author when the candidate accepts it. */
final class OfferAcceptedNotification extends CompanyNotification
{
    public function __construct(public readonly Offer $offer) {}

    public function type(): string
    {
        return 'offer.accepted';
    }

    public function title(): string
    {
        return 'Offer accepted';
    }

    public function message(): string
    {
        return sprintf(
            '%s accepted the offer for "%s". Time to celebrate!',
            $this->offer->application->candidate->full_name,
            $this->offer->application->jobPosting->title,
        );
    }

    public function link(): string
    {
        return '/offers/'.$this->offer->id;
    }
}
