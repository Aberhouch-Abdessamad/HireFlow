<?php

namespace App\Notifications;

/** Sent to participants and the scheduler when an interview is cancelled. */
final class InterviewCancelledNotification extends InterviewChangedNotification
{
    public function type(): string
    {
        return 'interview.cancelled';
    }

    public function title(): string
    {
        return 'Interview cancelled';
    }

    public function message(): string
    {
        $message = sprintf(
            'The %s interview with %s (%s) scheduled for %s was cancelled.',
            $this->interview->type->label(),
            $this->candidateName(),
            $this->jobTitle(),
            $this->slot(),
        );

        if ($this->interview->cancellation_reason !== null) {
            $message .= ' Reason: '.$this->interview->cancellation_reason;
        }

        return $message;
    }
}
