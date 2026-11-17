<?php

namespace App\Notifications;

use App\Models\Interview;

/**
 * Base for scheduled / rescheduled / cancelled interview alerts. Listeners are
 * responsible for loading the relations used in the message before sending.
 */
abstract class InterviewChangedNotification extends CompanyNotification
{
    public function __construct(public readonly Interview $interview) {}

    public function link(): string
    {
        return '/interviews/'.$this->interview->id;
    }

    /** Formats the interview slot in the interview's own timezone. */
    protected function slot(): string
    {
        return $this->interview->scheduled_at
            ->timezone($this->interview->timezone)
            ->format('D, M j Y \a\t H:i');
    }

    protected function candidateName(): string
    {
        return $this->interview->application->candidate->full_name;
    }

    protected function jobTitle(): string
    {
        return $this->interview->application->jobPosting->title;
    }
}
