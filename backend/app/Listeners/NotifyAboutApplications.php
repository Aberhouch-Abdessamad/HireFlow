<?php

namespace App\Listeners;

use App\Enums\PermissionName;
use App\Events\ApplicationStageChanged;
use App\Events\ApplicationSubmitted;
use App\Models\User;
use App\Notifications\ApplicationStageChangedNotification;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Permission;

/**
 * In-app notifications for application events. Registered automatically by
 * Laravel's event discovery (handle* method names).
 */
final class NotifyAboutApplications
{
    /**
     * A new application arrived: alert everyone who can triage/assign it.
     * Recipients are resolved through Spatie's teams-aware permission scope,
     * so only members of the current company (team) are notified.
     */
    public function handleApplicationSubmitted(ApplicationSubmitted $event): void
    {
        $application = $event->application->loadMissing('jobPosting', 'candidate');

        if (! Permission::query()->where('name', PermissionName::ApplicationsAssign->value)->where('guard_name', 'web')->exists()) {
            return;
        }

        $recipients = User::query()
            ->permission(PermissionName::ApplicationsAssign->value)
            ->where('is_active', true)
            ->get();

        Notification::send($recipients, new ApplicationSubmittedNotification($application));
    }

    /** The application moved stage or changed status: alert the assignee, not the performer. */
    public function handleApplicationStageChanged(ApplicationStageChanged $event): void
    {
        $application = $event->application->loadMissing('jobPosting', 'candidate', 'assignee');
        $event->transition->loadMissing('toStage');

        $assignee = $application->assignee;

        if ($assignee === null || $assignee->id === $event->transition->performed_by) {
            return;
        }

        $assignee->notify(new ApplicationStageChangedNotification($application, $event->transition));
    }
}
