<?php

namespace Tests\Feature\System;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_reports_status(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.api_version', 'v1')
            ->assertJsonPath('data.checks.database', 'ok')
            ->assertJsonStructure(['data' => ['status', 'api_version', 'server_time', 'checks' => ['database']]]);
    }

    public function test_unknown_api_routes_return_consistent_json_errors(): void
    {
        $this->get('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Resource not found.', 'code' => 'NOT_FOUND']);
    }

    public function test_sanctum_csrf_cookie_endpoint_is_available(): void
    {
        $this->get('/sanctum/csrf-cookie')
            ->assertNoContent()
            ->assertCookie('XSRF-TOKEN');
    }
}
