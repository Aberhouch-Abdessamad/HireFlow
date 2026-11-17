<?php

namespace Tests\Feature\Company;

use App\Enums\SystemRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_members_can_view_their_company(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);

        Sanctum::actingAs($recruiter);

        $this->getJson('/api/v1/company')->assertOk()->assertJsonPath('data.id', $company->id);
    }

    public function test_admin_can_update_company_and_it_is_audited(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/company', [
            'name' => 'Renamed Co',
            'timezone' => 'Africa/Casablanca',
            'website' => 'https://renamed.test',
        ])->assertOk()->assertJsonPath('data.name', 'Renamed Co');

        $this->assertDatabaseHas('companies', ['id' => $company->id, 'name' => 'Renamed Co']);
        $this->assertDatabaseHas('audit_logs', ['company_id' => $company->id, 'event' => 'company.updated']);
    }

    public function test_recruiter_cannot_update_company(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->putJson('/api/v1/company', ['name' => 'Hacked', 'timezone' => 'UTC'])
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_user_can_switch_only_to_companies_they_belong_to(): void
    {
        [$companyA, $admin] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        [$companyC] = $this->companyWithAdmin();
        $this->addMember($companyB, $admin, SystemRole::Recruiter);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/company/switch', ['company_id' => $companyB->id])->assertOk();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.current_company.id', $companyB->id);

        $this->postJson('/api/v1/company/switch', ['company_id' => $companyC->id])
            ->assertForbidden()
            ->assertJsonPath('code', 'NOT_A_MEMBER');

        $this->getJson('/api/v1/auth/companies')->assertOk()->assertJsonCount(2, 'data');
        $this->assertNotSame($companyA->id, $admin->fresh()->current_company_id);
    }
}
