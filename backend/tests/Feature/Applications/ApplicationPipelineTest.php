<?php

namespace Tests\Feature\Applications;

use App\Enums\SystemRole;
use App\Models\Application;
use App\Models\Company;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApplicationPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    private function stage(Company $company, string $type): RecruitmentStage
    {
        return app(TenantContext::class)->runAs($company, fn () => RecruitmentStage::where('type', $type)->firstOrFail());
    }

    /** @return array{0: Company, 1: User, 2: int} */
    private function applicationSetup(): array
    {
        [$company, $admin] = $this->companyWithAdmin();
        $job = $this->makeJob($company, [], 'published');
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($admin);

        $id = $this->postJson('/api/v1/applications', ['candidate_id' => $candidate->id, 'job_id' => $job->id])
            ->assertCreated()
            ->assertJsonPath('data.stage.type', 'applied')
            ->json('data.id');

        return [$company, $admin, $id];
    }

    public function test_new_companies_get_the_default_pipeline(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $names = collect($this->getJson('/api/v1/recruitment-stages')->assertOk()->json('data'))->pluck('name')->all();
        $this->assertSame(['Applied', 'CV Screening', 'Shortlisted', 'Interview', 'Assessment', 'Offer', 'Hired'], $names);
    }

    public function test_duplicate_applications_are_rejected(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $job = $this->makeJob($company, [], 'published');
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($admin);

        $payload = ['candidate_id' => $candidate->id, 'job_id' => $job->id];
        $this->postJson('/api/v1/applications', $payload)->assertCreated();
        $this->postJson('/api/v1/applications', $payload)->assertStatus(409)->assertJsonPath('code', 'ALREADY_APPLIED');
        $this->assertSame(1, app(TenantContext::class)->runAs($company, fn () => Application::count()));
    }

    public function test_stage_transitions_are_recorded_with_actor_and_notes(): void
    {
        [$company, $admin, $id] = $this->applicationSetup();
        $shortlist = $this->stage($company, 'shortlist');

        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $shortlist->id, 'notes' => 'Great portfolio'])
            ->assertOk()
            ->assertJsonPath('data.stage.name', 'Shortlisted');

        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $shortlist->id])
            ->assertStatus(409)->assertJsonPath('code', 'SAME_STAGE');

        $history = $this->getJson("/api/v1/applications/{$id}/history")->assertOk()->json('data');
        $this->assertCount(2, $history);
        $this->assertSame('Applied', $history[0]['from_stage']);
        $this->assertSame('Shortlisted', $history[0]['to_stage']);
        $this->assertSame('Great portfolio', $history[0]['notes']);
        $this->assertSame($admin->name, $history[0]['performed_by']);
    }

    public function test_hired_stage_requires_an_accepted_offer(): void
    {
        [$company, , $id] = $this->applicationSetup();

        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $this->stage($company, 'hired')->id])
            ->assertStatus(409)
            ->assertJsonPath('code', 'HIRE_REQUIRES_OFFER');
    }

    public function test_stage_from_another_company_is_rejected(): void
    {
        [, , $id] = $this->applicationSetup();
        [$other] = $this->companyWithAdmin();

        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $this->stage($other, 'interview')->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('stage_id');
    }

    public function test_reject_then_reopen(): void
    {
        [$company, , $id] = $this->applicationSetup();

        $this->postJson("/api/v1/applications/{$id}/reject", ['reason' => 'other'])
            ->assertUnprocessable()->assertJsonValidationErrors('note');

        $this->postJson("/api/v1/applications/{$id}/reject", ['reason' => 'skills_mismatch', 'note' => 'Needs more React'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection.reason', 'skills_mismatch')
            ->assertJsonPath('data.stage.type', 'applied');

        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $this->stage($company, 'interview')->id])
            ->assertStatus(409)->assertJsonPath('code', 'APPLICATION_CLOSED');

        $this->postJson("/api/v1/applications/{$id}/reopen")->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_assignment_requires_an_active_member_who_can_view_applications(): void
    {
        [$company, , $id] = $this->applicationSetup();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        [, $foreign] = $this->companyWithAdmin();

        $this->postJson("/api/v1/applications/{$id}/assign", ['user_id' => $recruiter->id])
            ->assertOk()->assertJsonPath('data.assignee.id', $recruiter->id);
        $this->postJson("/api/v1/applications/{$id}/assign", ['user_id' => $interviewer->id])->assertUnprocessable();
        $this->postJson("/api/v1/applications/{$id}/assign", ['user_id' => $foreign->id])->assertUnprocessable();
        $this->postJson("/api/v1/applications/{$id}/assign", ['user_id' => null])->assertOk()->assertJsonPath('data.assignee', null);
    }

    public function test_pipeline_board_groups_applications_by_stage(): void
    {
        [$company, , $id] = $this->applicationSetup();
        $this->postJson("/api/v1/applications/{$id}/stage", ['stage_id' => $this->stage($company, 'interview')->id])->assertOk();

        $board = collect($this->getJson('/api/v1/applications/pipeline')->assertOk()->json('data'))
            ->mapWithKeys(fn ($column) => [$column['stage']['name'] => count($column['applications'])]);

        $this->assertSame(1, $board['Interview']);
        $this->assertSame(0, $board['Applied']);
    }

    public function test_comments_and_permissions(): void
    {
        [$company, , $id] = $this->applicationSetup();
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);

        $this->postJson("/api/v1/applications/{$id}/notes", ['body' => 'Call scheduled'])->assertCreated();

        Sanctum::actingAs($interviewer);
        $this->getJson("/api/v1/applications/{$id}")->assertForbidden();

        Sanctum::actingAs($recruiter);
        $this->getJson("/api/v1/applications/{$id}/notes")->assertOk()->assertJsonPath('data.0.body', 'Call scheduled');
    }

    public function test_other_companies_cannot_see_applications(): void
    {
        [, , $id] = $this->applicationSetup();
        [, $otherAdmin] = $this->companyWithAdmin();
        Sanctum::actingAs($otherAdmin);

        $this->getJson("/api/v1/applications/{$id}")->assertNotFound();
        $this->postJson("/api/v1/applications/{$id}/reject", ['reason' => 'position_filled'])->assertNotFound();
        $this->getJson('/api/v1/applications')->assertJsonCount(0, 'data');
    }

    public function test_jobs_with_applications_cannot_be_deleted(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $job = $this->makeJob($company);
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/applications', ['candidate_id' => $candidate->id, 'job_id' => $job->id])->assertCreated();

        $this->deleteJson("/api/v1/jobs/{$job->id}")->assertStatus(409)->assertJsonPath('code', 'JOB_HAS_APPLICATIONS');
    }
}
