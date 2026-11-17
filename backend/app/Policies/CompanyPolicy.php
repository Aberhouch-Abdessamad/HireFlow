<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Company;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class CompanyPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function view(User $user, Company $company): bool
    {
        return $this->tenant->has() && $this->tenant->id() === $company->id;
    }

    public function update(User $user, Company $company): bool
    {
        return $this->view($user, $company) && $user->checkPermissionTo(PermissionName::CompanySettings->value);
    }
}
