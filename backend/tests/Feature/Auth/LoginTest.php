<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'jane@example.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@example.test',
            'password' => 'password',
        ])->assertOk();

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_is_rejected_with_a_validation_error(): void
    {
        User::factory()->create(['email' => 'jane@example.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'jane@example.test',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_deactivated_user_cannot_log_in_and_gets_the_same_generic_error(): void
    {
        User::factory()->inactive()->create(['email' => 'gone@example.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'gone@example.test',
            'password' => 'password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'jane@example.test']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'jane@example.test', 'password' => 'nope']);
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'jane@example.test', 'password' => 'nope'])
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    public function test_api_responses_never_expose_password_or_two_factor_secrets(): void
    {
        $user = User::factory()->create();

        $serialized = $user->toArray();

        $this->assertArrayNotHasKey('password', $serialized);
        $this->assertArrayNotHasKey('remember_token', $serialized);
        $this->assertArrayNotHasKey('two_factor_secret', $serialized);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $serialized);
    }
}
