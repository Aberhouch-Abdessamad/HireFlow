<?php

namespace Tests\Feature\Portal;

use App\Enums\SystemRole;
use App\Models\Candidate;
use App\Models\Scopes\CompanyScope;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CandidatePortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Notification::fake();
    }

    public function test_candidate_registers_and_sees_applications_across_companies(): void
    {
        [$companyA] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        $this->makeApplication($companyA, ['email' => 'sara@example.test']);
        $this->makeApplication($companyB, ['email' => 'sara@example.test']);
        $this->makeApplication($companyB, ['email' => 'someone.else@example.test']);

        $this->postJson('/api/v1/candidate/register', [
            'name' => 'Sara Benali',
            'email' => 'sara@example.test',
            'password' => 'Str0ngPassword!',
            'password_confirmation' => 'Str0ngPassword!',
        ])->assertCreated();

        $user = User::where('email', 'sara@example.test')->firstOrFail();
        $this->assertTrue($user->isCandidate());

        $this->assertSame(2, Candidate::withoutGlobalScope(CompanyScope::class)->where('user_id', $user->id)->count());
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/candidate/applications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.progress', 'received')
            ->assertJsonMissingPath('data.0.stage')
            ->assertJsonMissingPath('data.0.rejection');

        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.is_candidate', true)->assertJsonPath('data.current_company', null);
    }

    public function test_rejection_details_are_hidden_from_candidates(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $application = $this->makeApplication($company, ['email' => 'lina@example.test']);
        $candidate = User::factory()->create(['email' => 'lina@example.test']);
        $candidate->grantPlatformRole(SystemRole::Candidate);
        Candidate::withoutGlobalScope(CompanyScope::class)->whereKey($application->candidate_id)->update(['user_id' => $candidate->id]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/applications/{$application->id}/reject", ['reason' => 'culture_fit', 'note' => 'Internal only'])->assertOk();

        Sanctum::actingAs($candidate);
        $response = $this->getJson("/api/v1/candidate/applications/{$application->id}")->assertOk()->assertJsonPath('data.progress', 'not_selected');
        $this->assertStringNotContainsString('Internal only', $response->getContent());
        $this->assertStringNotContainsString('culture_fit', $response->getContent());
    }

    public function test_candidates_cannot_reach_other_peoples_records_or_company_endpoints(): void
    {
        [$company] = $this->companyWithAdmin();
        $foreignApplication = $this->makeApplication($company, ['email' => 'other@example.test']);
        $candidate = User::factory()->create(['email' => 'me@example.test']);
        $candidate->grantPlatformRole(SystemRole::Candidate);
        Sanctum::actingAs($candidate);

        $this->getJson("/api/v1/candidate/applications/{$foreignApplication->id}")->assertNotFound();
        $this->getJson('/api/v1/jobs')->assertForbidden()->assertJsonPath('code', 'NO_ACTIVE_COMPANY');
    }

    public function test_staff_cannot_use_the_candidate_portal(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/candidate/applications')->assertForbidden()->assertJsonPath('code', 'NOT_A_CANDIDATE');
    }
}
