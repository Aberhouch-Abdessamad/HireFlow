<?php

namespace App\Notifications;

use App\Models\Offer;

/** Sent to the offer's author when the candidate declines it. */
final class OfferDeclinedNotification extends CompanyNotification
{
    public function __construct(public readonly Offer $offer) {}

    public function type(): string
    {
        return 'offer.declined';
    }

    public function title(): string
    {
        return 'Offer declined';
    }

    public function message(): string
    {
        $message = sprintf(
            '%s declined the offer for "%s".',
            $this->offer->application->candidate->full_name,
            $this->offer->application->jobPosting->title,
        );

        if ($this->offer->response_note !== null) {
            $message .= ' Note: '.$this->offer->response_note;
        }

        return $message;
    }

    public function link(): string
    {
        return '/offers/'.$this->offer->id;
    }
}
