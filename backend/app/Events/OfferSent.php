<?php

namespace App\Events;

use App\Models\Offer;
use Illuminate\Foundation\Events\Dispatchable;

/** Dispatched after the database transaction commits. Notifications listen to it (Phase 6). */
final class OfferSent
{
    use Dispatchable;

    public function __construct(public readonly Offer $offer) {}
}
