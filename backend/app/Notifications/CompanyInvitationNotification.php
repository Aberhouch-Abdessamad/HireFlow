<?php

namespace App\Notifications;

use App\Enums\SystemRole;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CompanyInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $companyName,
        public readonly string $inviterName,
        public readonly SystemRole $role,
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
        $url = config('app.frontend_url').'/invitations/'.$this->token;

        return (new MailMessage)
            ->subject("You're invited to join {$this->companyName} on HireFlow")
            ->greeting('Hello!')
            ->line("{$this->inviterName} invited you to join {$this->companyName} as {$this->role->label()}.")
            ->action('Accept invitation', $url)
            ->line('This invitation expires in 7 days. If you were not expecting it, you can ignore this email.');
    }
}
