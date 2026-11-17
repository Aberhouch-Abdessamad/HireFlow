<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class RecruitmentStagePolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $this->tenant->has();
    }

    public function manage(User $user, ?RecruitmentStage $stage = null): bool
    {
        if ($stage !== null && (! $this->tenant->has() || (int) $stage->company_id !== $this->tenant->id())) {
            return false;
        }

        return $user->checkPermissionTo(PermissionName::CompanySettings->value);
    }
}
