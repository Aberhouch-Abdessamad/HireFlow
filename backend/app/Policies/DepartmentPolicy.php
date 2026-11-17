<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Department;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class DepartmentPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    /** Every member can read departments (used in filters and forms). */
    public function viewAny(User $user): bool
    {
        return $this->tenant->has();
    }

    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::CompanySettings->value);
    }

    public function update(User $user, Department $department): bool
    {
        return $this->tenant->has()
            && (int) $department->company_id === $this->tenant->id()
            && $user->checkPermissionTo(PermissionName::CompanySettings->value);
    }

    public function delete(User $user, Department $department): bool
    {
        return $this->update($user, $department);
    }
}
