<?php

namespace App\Listeners;

use App\Events\FeedbackSubmitted;
use App\Events\InterviewCancelled;
use App\Events\InterviewRescheduled;
use App\Events\InterviewScheduled;
use App\Models\Interview;
use App\Models\User;
use App\Notifications\FeedbackSubmittedNotification;
use App\Notifications\InterviewCancelledNotification;
use App\Notifications\InterviewRescheduledNotification;
use App\Notifications\InterviewScheduledNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * In-app notifications for interview events. Registered automatically by
 * Laravel's event discovery (handle* method names).
 */
final class NotifyAboutInterviews
{
    /** Relations used by the interview notification messages. */
    private const RELATIONS = ['application.jobPosting', 'application.candidate', 'participants', 'scheduler'];

    /** A new interview is booked: alert the invited participants (not the scheduler). */
    public function handleInterviewScheduled(InterviewScheduled $event): void
    {
        $interview = $event->interview->loadMissing(...self::RELATIONS);

        $recipients = $interview->participants
            ->reject(fn (User $participant) => $participant->id === $interview->scheduled_by)
            ->values();

        Notification::send($recipients, new InterviewScheduledNotification($interview));
    }

    /**
     * New slot: alert participants and the scheduler. The event carries no actor
     * (the service neither), so everyone follows up on the change.
     */
    public function handleInterviewRescheduled(InterviewRescheduled $event): void
    {
        $interview = $event->interview->loadMissing(...self::RELATIONS);

        Notification::send($this->audience($interview), new InterviewRescheduledNotification($interview));
    }

    /** Cancelled: alert participants and the scheduler. */
    public function handleInterviewCancelled(InterviewCancelled $event): void
    {
        $interview = $event->interview->loadMissing(...self::RELATIONS);

        Notification::send($this->audience($interview), new InterviewCancelledNotification($interview));
    }

    /** An interviewer submitted feedback: alert whoever scheduled the interview. */
    public function handleFeedbackSubmitted(FeedbackSubmitted $event): void
    {
        $feedback = $event->feedback->loadMissing(
            'interview.application.jobPosting',
            'interview.application.candidate',
            'author',
        );
        $feedback->interview->loadMissing('scheduler');

        $scheduler = $feedback->interview->scheduler;

        if ($scheduler === null || $scheduler->id === $feedback->user_id) {
            return;
        }

        $scheduler->notify(new FeedbackSubmittedNotification($feedback));
    }

    /**
     * Everyone involved in an interview: the participants plus the scheduler.
     *
     * @return Collection<int, User>
     */
    private function audience(Interview $interview): Collection
    {
        return $interview->participants
            ->when($interview->scheduler !== null, fn ($participants) => $participants->push($interview->scheduler))
            ->unique('id')
            ->values();
    }
}
