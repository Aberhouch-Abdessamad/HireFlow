<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Writes login, logout and failed-login events to the audit log.
 * Registered automatically by Laravel event discovery (handle* methods).
 */
class RecordAuthenticationEvents
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handleLogin(Login $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        $event->user->forceFill(['last_login_at' => now()])->saveQuietly();
        $this->audit->record('auth.login', $event->user, null, null, $event->user->current_company_id, $event->user->id);
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user instanceof User) {
            $this->audit->record('auth.logout', $event->user, null, null, $event->user->current_company_id, $event->user->id);
        }
    }

    public function handleFailed(Failed $event): void
    {
        $user = $event->user instanceof User ? $event->user : null;

        $this->audit->record(
            'auth.login_failed',
            $user,
            null,
            ['email' => (string) ($event->credentials['email'] ?? '')],
            $user?->current_company_id,
            null,
        );
    }
}
