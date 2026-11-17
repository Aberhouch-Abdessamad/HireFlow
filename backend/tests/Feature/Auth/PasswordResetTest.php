<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_response_is_identical_for_known_and_unknown_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'known@example.test']);

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.test'])->assertOk();
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test'])->assertOk();

        $this->assertSame($known->json(), $unknown->json());
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            return str_starts_with($notification->toMail($user)->actionUrl, config('app.frontend_url').'/reset-password?token=');
        });
    }

    public function test_user_can_reset_password_with_a_valid_token(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@example.test']);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'reset@example.test']);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token): bool {
            $token = $n->token;

            return true;
        });

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => 'reset@example.test',
            'password' => 'N3wStrongPassword',
            'password_confirmation' => 'N3wStrongPassword',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => 'reset@example.test', 'password' => 'N3wStrongPassword'])->assertOk();
    }
}
