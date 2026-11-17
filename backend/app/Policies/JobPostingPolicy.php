<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\JobPosting;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class JobPostingPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::JobsView->value);
    }

    public function view(User $user, JobPosting $job): bool
    {
        return $this->owns($job) && $user->checkPermissionTo(PermissionName::JobsView->value);
    }

    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::JobsCreate->value);
    }

    public function update(User $user, JobPosting $job): bool
    {
        return $this->owns($job) && $user->checkPermissionTo(PermissionName::JobsUpdate->value);
    }

    /** Publish, pause, close and archive. */
    public function changeStatus(User $user, JobPosting $job): bool
    {
        return $this->owns($job) && $user->checkPermissionTo(PermissionName::JobsPublish->value);
    }

    public function delete(User $user, JobPosting $job): bool
    {
        return $this->owns($job) && $user->checkPermissionTo(PermissionName::JobsDelete->value);
    }

    private function owns(JobPosting $job): bool
    {
        return $this->tenant->has() && (int) $job->company_id === $this->tenant->id();
    }
}
