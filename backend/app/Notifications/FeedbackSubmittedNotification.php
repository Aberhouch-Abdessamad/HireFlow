<?php

namespace App\Notifications;

use App\Models\InterviewFeedback;

/** Sent to the interview's scheduler once an interviewer submits their feedback. */
final class FeedbackSubmittedNotification extends CompanyNotification
{
    public function __construct(public readonly InterviewFeedback $feedback) {}

    public function type(): string
    {
        return 'feedback.submitted';
    }

    public function title(): string
    {
        return 'Interview feedback submitted';
    }

    public function message(): string
    {
        return sprintf(
            '%s submitted feedback for the %s interview with %s: %s.',
            $this->feedback->author->name,
            $this->feedback->interview->type->label(),
            $this->feedback->interview->application->candidate->full_name,
            $this->feedback->recommendation->label(),
        );
    }

    public function link(): string
    {
        return '/interviews/'.$this->feedback->interview->id;
    }
}
