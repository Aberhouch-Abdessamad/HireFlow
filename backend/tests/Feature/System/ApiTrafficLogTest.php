<?php

namespace Tests\Feature\System;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ApiTrafficLogTest extends TestCase
{
    use RefreshDatabase;

    private string $path;

    protected function setUp(): void
    {
        parent::setUp();
        $this->path = storage_path('logs/api-test-'.uniqid().'.log');
        config([
            'logging.api_traffic.enabled' => true,
            'logging.channels.api.driver' => 'single',
            'logging.channels.api.path' => $this->path,
        ]);
    }

    protected function tearDown(): void
    {
        File::delete($this->path);
        parent::tearDown();
    }

    public function test_requests_and_answers_are_logged_with_a_replayable_curl(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.test', 'password' => 'Sup3r-Secret!'])
            ->assertStatus(422);

        $log = File::get($this->path);
        $this->assertStringContainsString('┌─ POST /api/v1/auth/login', $log);
        $this->assertStringContainsString('✖ 422 Unprocessable Content', $log);
        $this->assertMatchesRegularExpression("#curl -X POST 'https?://[^']+/api/v1/auth/login'#", $log);
        $this->assertStringContainsString('-b cookies.txt -c cookies.txt', $log);
        $this->assertStringContainsString('"password":"<password>"', $log);
        $this->assertStringContainsString('"code": "VALIDATION_FAILED"', $log);
        $this->assertStringNotContainsString('Sup3r-Secret!', $log);
    }

    public function test_session_cookies_and_csrf_tokens_are_never_written(): void
    {
        $this->withCookie('hireflow-session', 'SESSION-VALUE-123')
            ->withHeader('X-XSRF-TOKEN', 'XSRF-VALUE-456')
            ->getJson('/api/v1/health')
            ->assertOk();

        $log = File::get($this->path);
        $this->assertStringContainsString('┌─ GET /api/v1/health', $log);
        $this->assertStringContainsString('✔ 200 OK', $log);
        $this->assertStringContainsString('"status": "ok"', $log);
        $this->assertStringNotContainsString('▸ request', $log);
        $this->assertStringNotContainsString('SESSION-VALUE-123', $log);
        $this->assertStringNotContainsString('XSRF-VALUE-456', $log);
    }

    public function test_non_api_routes_are_not_logged(): void
    {
        $this->get('/up')->assertOk();

        $this->assertFileDoesNotExist($this->path);
    }

    public function test_nothing_is_written_when_disabled(): void
    {
        config(['logging.api_traffic.enabled' => false]);

        $this->getJson('/api/v1/health')->assertOk();

        $this->assertFileDoesNotExist($this->path);
    }
}
