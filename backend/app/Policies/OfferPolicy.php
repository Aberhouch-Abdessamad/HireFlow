<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Offer;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class OfferPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::OffersView->value);
    }

    public function view(User $user, Offer $offer): bool
    {
        return $this->owns($offer) && $user->checkPermissionTo(PermissionName::OffersView->value);
    }

    /** Create, edit drafts, submit for approval, withdraw. */
    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::OffersCreate->value);
    }

    public function manage(User $user, Offer $offer): bool
    {
        return $this->owns($offer) && $user->checkPermissionTo(PermissionName::OffersCreate->value);
    }

    public function approve(User $user, Offer $offer): bool
    {
        return $this->owns($offer) && $user->checkPermissionTo(PermissionName::OffersApprove->value);
    }

    /** Send to the candidate, and record a response on their behalf. */
    public function send(User $user, Offer $offer): bool
    {
        return $this->owns($offer) && $user->checkPermissionTo(PermissionName::OffersSend->value);
    }

    private function owns(Offer $offer): bool
    {
        return $this->tenant->has() && (int) $offer->company_id === $this->tenant->id();
    }
}
