<?php

namespace Tests\Feature\Auth;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class AuditTrailTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_and_failed_logins_are_audited(): void
    {
        $user = User::factory()->create(['email' => 'audit@example.test']);

        $this->postJson('/api/v1/auth/login', ['email' => 'audit@example.test', 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', ['email' => 'audit@example.test', 'password' => 'password'])->assertOk();

        $this->assertTrue(AuditLog::where('event', 'auth.login_failed')->exists());
        $this->assertTrue(AuditLog::where('event', 'auth.login')->where('actor_id', $user->id)->exists());
        $this->assertNotNull($user->fresh()->last_login_at);

        $failed = AuditLog::where('event', 'auth.login_failed')->firstOrFail();
        $this->assertArrayNotHasKey('password', $failed->new_values ?? []);
    }

    public function test_audit_logs_are_append_only(): void
    {
        $log = AuditLog::create(['event' => 'test.event']);

        $this->expectException(LogicException::class);
        $log->update(['event' => 'tampered']);
    }
}
