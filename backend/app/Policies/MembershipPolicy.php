<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Membership;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class MembershipPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::UsersManage->value);
    }

    public function update(User $user, Membership $membership): bool
    {
        return $this->tenant->has()
            && (int) $membership->company_id === $this->tenant->id()
            && $user->checkPermissionTo(PermissionName::UsersManage->value);
    }
}
