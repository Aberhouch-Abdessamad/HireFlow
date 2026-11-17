<?php

namespace App\Notifications;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\ApplicationStageHistory;

/**
 * Sent to the application's assignee whenever it moves stage or its status changes
 * (moved, rejected, reopened or hired). The performer themselves is not notified.
 */
final class ApplicationStageChangedNotification extends CompanyNotification
{
    public function __construct(
        public readonly Application $application,
        public readonly ApplicationStageHistory $transition,
    ) {}

    public function type(): string
    {
        return 'application.stage_changed';
    }

    public function title(): string
    {
        return 'Application updated';
    }

    public function message(): string
    {
        $candidate = $this->application->candidate->full_name;
        $status = ApplicationStatus::from($this->transition->to_status);

        if ($status === ApplicationStatus::Hired) {
            return sprintf('%s was hired. Congratulations!', $candidate);
        }

        if ($status === ApplicationStatus::Rejected) {
            return sprintf("%s's application was rejected.", $candidate);
        }

        $toStage = $this->transition->toStage;

        if ($toStage !== null && $this->transition->from_stage_id !== $this->transition->to_stage_id) {
            return sprintf('%s moved to the "%s" stage.', $candidate, $toStage->name);
        }

        return sprintf("%s's application was reopened.", $candidate);
    }

    public function link(): string
    {
        return '/applications/'.$this->application->id;
    }
}
