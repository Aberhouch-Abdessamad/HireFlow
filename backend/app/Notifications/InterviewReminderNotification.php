<?php

namespace App\Notifications;

use App\Models\Interview;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Reminder for interviews happening in the next 24 hours, sent by the
 * `interviews:send-reminders` scheduler command.
 *
 * Staff (interview participants) receive the in-app/database channel and email;
 * the candidate is notified by email only (an anonymous, e-mail routed notifiable).
 * Queued: one interview may fan out to several recipients and SMTP is slow.
 */
final class InterviewReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Interview $interview)
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        // Anonymous candidate notifiables only carry an e-mail route.
        return $notifiable instanceof User ? ['database', 'mail'] : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $interview = $this->loaded();
        $when = $interview->scheduled_at
            ->timezone($interview->timezone)
            ->format('l, j F Y \a\t H:i');
        $candidate = $interview->application->candidate->full_name;
        $job = $interview->application->jobPosting->title;

        $mail = (new MailMessage)
            ->subject("Reminder: {$interview->type->label()} with {$candidate}")
            ->greeting($notifiable instanceof User ? "Hello {$notifiable->name}," : 'Hello,')
            ->line(
                sprintf(
                    'This is a reminder for the %s interview with %s (%s) on %s (%s).',
                    $interview->type->label(),
                    $candidate,
                    $job,
                    $when,
                    $interview->timezone,
                ),
            );

        if ($interview->meeting_url !== null) {
            $mail->line("Join online: {$interview->meeting_url}");
        } elseif ($interview->location !== null) {
            $mail->line("Location: {$interview->location}");
        }

        return $mail->action('View details', $this->url($notifiable));
    }

    /** Staff open the interview page; candidates open their application in the portal. */
    private function url(object $notifiable): string
    {
        $path = $notifiable instanceof User
            ? '/interviews/'.$this->loaded()->id
            : '/candidate/applications/'.$this->interview->application_id;

        return config('app.frontend_url').$path;
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $interview = $this->loaded();
        $candidate = $interview->application->candidate->full_name;
        $when = $interview->scheduled_at
            ->timezone($interview->timezone)
            ->format('D, M j Y \a\t H:i');

        return [
            'type' => 'interview.reminder',
            'title' => 'Interview reminder',
            'message' => sprintf('%s interview with %s starts on %s.', $interview->type->label(), $candidate, $when),
            'link' => '/interviews/'.$interview->id,
        ];
    }

    /**
     * Queued notifications are re-fetched from storage on the worker, so
     * relations must be loaded explicitly (lazy loading is forbidden).
     */
    private function loaded(): Interview
    {
        return $this->interview->loadMissing('application.candidate', 'application.jobPosting');
    }
}
