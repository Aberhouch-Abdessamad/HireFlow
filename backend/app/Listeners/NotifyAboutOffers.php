<?php

namespace App\Listeners;

use App\Enums\PermissionName;
use App\Events\OfferAccepted;
use App\Events\OfferDeclined;
use App\Events\OfferSubmittedForApproval;
use App\Models\User;
use App\Notifications\OfferAcceptedNotification;
use App\Notifications\OfferDeclinedNotification;
use App\Notifications\OfferSubmittedForApprovalNotification;
use Illuminate\Support\Facades\Notification;

/**
 * In-app notifications for offer events. Registered automatically by
 * Laravel's event discovery (handle* method names).
 */
final class NotifyAboutOffers
{
    private const RELATIONS = ['application.jobPosting', 'application.candidate', 'creator'];

    /** A draft offer needs approval: alert everyone who can approve it, except its author. */
    public function handleOfferSubmittedForApproval(OfferSubmittedForApproval $event): void
    {
        $offer = $event->offer->loadMissing(...self::RELATIONS);

        $recipients = User::query()
            ->permission(PermissionName::OffersApprove->value)
            ->where('is_active', true)
            ->when($offer->created_by !== null, fn ($query) => $query->whereKeyNot($offer->created_by))
            ->get();

        Notification::send($recipients, new OfferSubmittedForApprovalNotification($offer));
    }

    /** The candidate accepted: alert the offer's author. */
    public function handleOfferAccepted(OfferAccepted $event): void
    {
        $offer = $event->offer->loadMissing(...self::RELATIONS);

        $offer->creator?->notify(new OfferAcceptedNotification($offer));
    }

    /** The candidate declined: alert the offer's author. */
    public function handleOfferDeclined(OfferDeclined $event): void
    {
        $offer = $event->offer->loadMissing(...self::RELATIONS);

        $offer->creator?->notify(new OfferDeclinedNotification($offer));
    }
}
