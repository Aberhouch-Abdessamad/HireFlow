<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Application;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class ApplicationPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::ApplicationsView->value);
    }

    public function view(User $user, Application $application): bool
    {
        return $this->owns($application) && $user->checkPermissionTo(PermissionName::ApplicationsView->value);
    }

    /** Manually adding a candidate to a job. */
    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::ApplicationsUpdateStage->value);
    }

    public function moveStage(User $user, Application $application): bool
    {
        return $this->owns($application) && $user->checkPermissionTo(PermissionName::ApplicationsUpdateStage->value);
    }

    public function assign(User $user, Application $application): bool
    {
        return $this->owns($application) && $user->checkPermissionTo(PermissionName::ApplicationsAssign->value);
    }

    /** Reject and reopen. */
    public function reject(User $user, Application $application): bool
    {
        return $this->owns($application) && $user->checkPermissionTo(PermissionName::ApplicationsReject->value);
    }

    /** Internal comments: anyone who can see the application. */
    public function comment(User $user, Application $application): bool
    {
        return $this->view($user, $application);
    }

    private function owns(Application $application): bool
    {
        return $this->tenant->has() && (int) $application->company_id === $this->tenant->id();
    }
}
