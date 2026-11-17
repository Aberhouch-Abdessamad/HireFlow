<?php

namespace Tests\Feature\Tenancy;

use App\Enums\MembershipStatus;
use App\Enums\PermissionName;
use App\Enums\SystemRole;
use App\Models\Company;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResolveTenantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();

        Route::middleware(['api', 'auth:sanctum', 'active', 'tenant'])
            ->get('/api/v1/__tenant-probe', fn () => response()->json([
                'company_id' => app(TenantContext::class)->id(),
                'can_manage_users' => request()->user()->can(PermissionName::UsersManage->value),
                'can_view_jobs' => request()->user()->can(PermissionName::JobsView->value),
            ]));
    }

    public function test_guests_are_rejected_with_json_401(): void
    {
        $this->getJson('/api/v1/__tenant-probe')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.', 'code' => 'UNAUTHENTICATED']);
    }

    public function test_tenant_is_resolved_from_the_users_current_company(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $user = $this->addMember($companyA, User::factory()->create());
        $this->addMember($companyB, $user);
        $user->forceFill(['current_company_id' => $companyB->id])->save();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/__tenant-probe')
            ->assertOk()
            ->assertJsonPath('company_id', $companyB->id);
    }

    public function test_client_supplied_company_id_is_ignored(): void
    {
        $own = Company::factory()->create();
        $other = Company::factory()->create();
        $user = $this->addMember($own, User::factory()->create());

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/__tenant-probe?company_id='.$other->id, ['X-Company-Id' => (string) $other->id])
            ->assertOk()
            ->assertJsonPath('company_id', $own->id);
    }

    public function test_stale_selection_falls_back_to_an_active_membership(): void
    {
        $left = Company::factory()->create();
        $current = Company::factory()->create();
        $user = $this->addMember($left, User::factory()->create());
        $this->addMember($current, $user);

        $user->memberships()->where('company_id', $left->id)->update(['status' => MembershipStatus::Deactivated->value]);
        $user->forceFill(['current_company_id' => $left->id])->save();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/__tenant-probe')
            ->assertOk()
            ->assertJsonPath('company_id', $current->id);

        $this->assertSame($current->id, $user->fresh()->current_company_id);
    }

    public function test_memberships_in_inactive_companies_are_not_used(): void
    {
        $company = Company::factory()->inactive()->create();
        $user = $this->addMember($company, User::factory()->create());

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/__tenant-probe')
            ->assertForbidden()
            ->assertJsonPath('code', 'NO_ACTIVE_COMPANY');
    }

    public function test_user_without_membership_is_forbidden(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/__tenant-probe')
            ->assertForbidden()
            ->assertJsonPath('code', 'NO_ACTIVE_COMPANY');
    }

    public function test_deactivated_user_is_rejected(): void
    {
        $company = Company::factory()->create();
        $user = $this->addMember($company, User::factory()->inactive()->create());

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/__tenant-probe')
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_DEACTIVATED');
    }

    public function test_roles_are_scoped_to_the_active_company(): void
    {
        $adminCompany = Company::factory()->create();
        $interviewerCompany = Company::factory()->create();
        $user = User::factory()->create();
        $this->addMember($adminCompany, $user, SystemRole::CompanyAdmin);
        $this->addMember($interviewerCompany, $user, SystemRole::Interviewer);

        Sanctum::actingAs($user);

        $user->forceFill(['current_company_id' => $adminCompany->id])->save();
        $this->getJson('/api/v1/__tenant-probe')
            ->assertJsonPath('can_manage_users', true)
            ->assertJsonPath('can_view_jobs', true);

        $user->forceFill(['current_company_id' => $interviewerCompany->id])->save();
        $this->getJson('/api/v1/__tenant-probe')
            ->assertJsonPath('can_manage_users', false)
            ->assertJsonPath('can_view_jobs', false);
    }

    public function test_super_admin_role_is_platform_scoped(): void
    {
        $company = Company::factory()->create();
        $admin = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $admin->grantSuperAdmin();

        $this->assertTrue($admin->fresh()->isSuperAdmin());

        Sanctum::actingAs($admin->fresh());
        $this->getJson('/api/v1/__tenant-probe')->assertJsonPath('can_manage_users', true);

        // A super_admin role assigned inside a company does not grant platform access.
        $member = $this->addMember($company, User::factory()->create(), SystemRole::SuperAdmin);
        $this->assertFalse($member->fresh()->isSuperAdmin());
    }
}
