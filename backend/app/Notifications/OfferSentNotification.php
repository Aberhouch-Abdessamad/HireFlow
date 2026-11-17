<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email to the candidate with a private link to review and respond to the offer. */
class OfferSentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $candidateFirstName,
        public readonly string $companyName,
        public readonly string $jobTitle,
        public readonly string $expiresAt,
        private readonly string $token,
    ) {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Your offer from {$this->companyName}")
            ->greeting("Hello {$this->candidateFirstName},")
            ->line("{$this->companyName} is pleased to offer you the position of {$this->jobTitle}.")
            ->action('Review your offer', config('app.frontend_url').'/offers/respond/'.$this->token)
            ->line("Please respond before {$this->expiresAt}. This link is personal; do not share it.");
    }
}
