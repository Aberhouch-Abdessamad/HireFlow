<?php

namespace App\Notifications;

/** Sent to participants and the scheduler when an interview moves to a new slot. */
final class InterviewRescheduledNotification extends InterviewChangedNotification
{
    public function type(): string
    {
        return 'interview.rescheduled';
    }

    public function title(): string
    {
        return 'Interview rescheduled';
    }

    public function message(): string
    {
        return sprintf(
            'The %s interview with %s (%s) moved to %s.',
            $this->interview->type->label(),
            $this->candidateName(),
            $this->jobTitle(),
            $this->slot(),
        );
    }
}
