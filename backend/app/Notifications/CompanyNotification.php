<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Base class for in-app (database) notifications shown in the shared /notifications feed.
 *
 * The payload is intentionally flat — type/title/message/link — so the frontend can
 * render every notification the same way without per-type templates. `type` is a
 * short machine key (e.g. 'application.submitted'); the notification class name is
 * stored separately in the `notifications.type` column by the database channel.
 */
abstract class CompanyNotification extends Notification
{
    /** Short machine key, e.g. 'application.submitted'. */
    abstract public function type(): string;

    abstract public function title(): string;

    abstract public function message(): string;

    /** SPA path the notification points at, e.g. '/applications/42'. */
    abstract public function link(): string;

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type(),
            'title' => $this->title(),
            'message' => $this->message(),
            'link' => $this->link(),
        ];
    }
}
