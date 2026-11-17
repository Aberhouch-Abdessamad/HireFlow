<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Invitation;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class InvitationPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::UsersManage->value);
    }

    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::UsersManage->value);
    }

    public function delete(User $user, Invitation $invitation): bool
    {
        return $this->tenant->has()
            && (int) $invitation->company_id === $this->tenant->id()
            && $user->checkPermissionTo(PermissionName::UsersManage->value);
    }
}
