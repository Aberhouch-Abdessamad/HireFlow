<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Candidate;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

class CandidatePolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::CandidatesView->value);
    }

    public function view(User $user, Candidate $candidate): bool
    {
        return $this->owns($candidate) && $user->checkPermissionTo(PermissionName::CandidatesView->value);
    }

    public function create(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::CandidatesCreate->value);
    }

    /** Also covers notes and documents. */
    public function update(User $user, Candidate $candidate): bool
    {
        return $this->owns($candidate) && $user->checkPermissionTo(PermissionName::CandidatesUpdate->value);
    }

    public function delete(User $user, Candidate $candidate): bool
    {
        return $this->owns($candidate) && $user->checkPermissionTo(PermissionName::CandidatesDelete->value);
    }

    private function owns(Candidate $candidate): bool
    {
        return $this->tenant->has() && (int) $candidate->company_id === $this->tenant->id();
    }
}
