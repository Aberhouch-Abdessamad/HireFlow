<?php

namespace Tests\Feature\Auth;

use App\Enums\SystemRole;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'company_name' => 'Northwind Labs',
            'name' => 'Ada Admin',
            'email' => 'Ada@Northwind.test',
            'password' => 'Str0ngPassword!',
            'password_confirmation' => 'Str0ngPassword!',
        ], $overrides);
    }

    public function test_registration_creates_company_admin_and_signs_in(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        $user = User::where('email', 'ada@northwind.test')->firstOrFail();
        $company = Company::where('name', 'Northwind Labs')->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $this->assertSame($company->id, $user->current_company_id);
        $this->assertSame('northwind-labs', $company->slug);
        $this->assertNotNull($user->activeMembershipIn($company->id));

        setPermissionsTeamId($company->id);
        $this->assertTrue($user->fresh()->hasRole(SystemRole::CompanyAdmin->value));

        $this->assertTrue(AuditLog::where('event', 'company.registered')->where('company_id', $company->id)->exists());
    }

    public function test_me_returns_company_and_permissions_after_registration(): void
    {
        Notification::fake();
        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'ada@northwind.test')
            ->assertJsonPath('data.email_verified', false)
            ->assertJsonPath('data.current_company.name', 'Northwind Labs')
            ->assertJsonPath('data.roles', ['company_admin'])
            ->assertJsonMissingPath('data.password');

        $this->assertContains('users.manage', $this->getJson('/api/v1/auth/me')->json('data.permissions'));
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'ada@northwind.test']);

        $this->postJson('/api/v1/auth/register', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('companies', 0);
    }

    public function test_weak_password_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload([
            'password' => 'short',
            'password_confirmation' => 'short',
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_company_slug_is_unique(): void
    {
        Notification::fake();
        Company::factory()->create(['name' => 'Northwind Labs', 'slug' => 'northwind-labs']);

        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        $this->assertSame(2, Company::where('name', 'Northwind Labs')->count());
        $this->assertSame(2, Company::pluck('slug')->unique()->count());
    }
}
