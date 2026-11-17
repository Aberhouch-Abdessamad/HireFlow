<?php

namespace App\Notifications;

/** Sent to invited participants (not the scheduler) when an interview is booked. */
final class InterviewScheduledNotification extends InterviewChangedNotification
{
    public function type(): string
    {
        return 'interview.scheduled';
    }

    public function title(): string
    {
        return 'Interview scheduled';
    }

    public function message(): string
    {
        return sprintf(
            '%s interview with %s (%s) is set for %s.',
            $this->interview->type->label(),
            $this->candidateName(),
            $this->jobTitle(),
            $this->slot(),
        );
    }
}
