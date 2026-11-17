<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Interview;
use App\Models\InterviewFeedback;
use App\Models\User;
use App\Support\Tenancy\TenantContext;

/**
 * Interviewers see only the interviews they take part in. Schedulers (HR, recruiters, admins)
 * see every interview in the company.
 */
class InterviewPolicy
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function viewAny(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::InterviewsView->value);
    }

    public function view(User $user, Interview $interview): bool
    {
        return $this->owns($interview)
            && $user->checkPermissionTo(PermissionName::InterviewsView->value)
            && ($this->isScheduler($user) || $interview->hasParticipant($user));
    }

    public function create(User $user): bool
    {
        return $this->isScheduler($user);
    }

    public function update(User $user, Interview $interview): bool
    {
        return $this->owns($interview) && $this->isScheduler($user);
    }

    public function submitFeedback(User $user, Interview $interview): bool
    {
        return $this->owns($interview)
            && $user->checkPermissionTo(PermissionName::InterviewsSubmitFeedback->value)
            && $interview->hasParticipant($user);
    }

    /**
     * Everyone's feedback: schedulers always; participants only after submitting their own,
     * so earlier opinions don't influence them.
     */
    public function viewAllFeedback(User $user, Interview $interview): bool
    {
        if (! $this->view($user, $interview)) {
            return false;
        }

        return $this->isScheduler($user)
            || InterviewFeedback::query()->where('interview_id', $interview->id)->where('user_id', $user->id)->exists();
    }

    public function isScheduler(User $user): bool
    {
        return $user->checkPermissionTo(PermissionName::InterviewsSchedule->value);
    }

    private function owns(Interview $interview): bool
    {
        return $this->tenant->has() && (int) $interview->company_id === $this->tenant->id();
    }
}
