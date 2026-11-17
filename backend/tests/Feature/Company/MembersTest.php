<?php

namespace Tests\Feature\Company;

use App\Enums\SystemRole;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MembersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    private function membershipOf(User $user, int $companyId): Membership
    {
        return Membership::where('user_id', $user->id)->where('company_id', $companyId)->firstOrFail();
    }

    public function test_admin_lists_only_own_company_members(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        [, $otherAdmin] = $this->companyWithAdmin();

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/company/members')->assertOk()->assertJsonCount(2, 'data');
        $this->assertNotContains($otherAdmin->email, array_column(array_column($response->json('data'), 'user'), 'email'));
        $response->assertJsonPath('meta.total', 2);
    }

    public function test_recruiter_cannot_manage_members(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->getJson('/api/v1/company/members')->assertForbidden();
    }

    public function test_admin_changes_a_members_role(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $member = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/company/members/'.$this->membershipOf($member, $company->id)->id.'/role', ['role' => 'hr_manager'])
            ->assertOk()
            ->assertJsonPath('data.role', 'hr_manager');

        $this->assertDatabaseHas('audit_logs', ['company_id' => $company->id, 'event' => 'member.role_changed']);
    }

    public function test_super_admin_role_cannot_be_assigned_by_a_company(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $member = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/company/members/'.$this->membershipOf($member, $company->id)->id.'/role', ['role' => 'super_admin'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_admin_cannot_change_own_role(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/company/members/'.$this->membershipOf($admin, $company->id)->id.'/role', ['role' => 'recruiter'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'SELF_MODIFICATION');
    }

    public function test_last_admin_cannot_be_demoted_or_deactivated(): void
    {
        [$company, $admin] = $this->companyWithAdmin();

        // A platform Super Admin (passes every policy) acting inside the company.
        $platformAdmin = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $platformAdmin->grantSuperAdmin();
        Sanctum::actingAs($platformAdmin->fresh());

        $adminMembership = $this->membershipOf($admin, $company->id)->id;

        $this->putJson('/api/v1/company/members/'.$adminMembership.'/role', ['role' => 'recruiter'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'LAST_COMPANY_ADMIN');

        $this->deleteJson('/api/v1/company/members/'.$adminMembership)
            ->assertStatus(409)
            ->assertJsonPath('code', 'LAST_COMPANY_ADMIN');
    }

    public function test_an_admin_can_be_demoted_when_another_admin_remains(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $secondAdmin = $this->addMember($company, User::factory()->create(), SystemRole::CompanyAdmin);
        Sanctum::actingAs($secondAdmin);

        $this->putJson('/api/v1/company/members/'.$this->membershipOf($admin, $company->id)->id.'/role', ['role' => 'recruiter'])
            ->assertOk()
            ->assertJsonPath('data.role', 'recruiter');
    }

    public function test_admin_deactivates_and_reactivates_a_member(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $member = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $membershipId = $this->membershipOf($member, $company->id)->id;
        Sanctum::actingAs($admin);

        $this->deleteJson('/api/v1/company/members/'.$membershipId)->assertOk()->assertJsonPath('data.status', 'deactivated');
        $this->postJson('/api/v1/company/members/'.$membershipId.'/activate')->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_members_of_other_companies_are_not_found(): void
    {
        [, $admin] = $this->companyWithAdmin();
        [$otherCompany, $otherAdmin] = $this->companyWithAdmin();
        $foreignId = $this->membershipOf($otherAdmin, $otherCompany->id)->id;
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/company/members/'.$foreignId.'/role', ['role' => 'recruiter'])->assertNotFound();
        $this->deleteJson('/api/v1/company/members/'.$foreignId)->assertNotFound();
    }
}
