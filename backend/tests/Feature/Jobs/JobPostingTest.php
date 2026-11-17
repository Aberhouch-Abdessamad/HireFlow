<?php

namespace Tests\Feature\Jobs;

use App\Enums\SystemRole;
use App\Models\Department;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobPostingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Senior Laravel Developer',
            'description' => 'Build and scale our recruitment platform with a great team.',
            'requirements' => '5+ years of PHP',
            'location' => 'Casablanca',
            'work_mode' => 'hybrid',
            'employment_type' => 'full_time',
            'experience_level' => 'senior',
            'salary_min' => 50000,
            'salary_max' => 70000,
            'salary_currency' => 'EUR',
            'salary_visible' => true,
            'skills' => [['name' => 'Laravel', 'is_required' => true], ['name' => 'Vue', 'is_required' => false]],
        ], $overrides);
    }

    public function test_hr_manager_creates_a_draft_job_with_skills_and_recruiters(): void
    {
        [$company] = $this->companyWithAdmin();
        $hr = $this->addMember($company, User::factory()->create(), SystemRole::HrManager);
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $department = app(TenantContext::class)->runAs($company, fn () => Department::create(['name' => 'Engineering']));
        Sanctum::actingAs($hr);

        $response = $this->postJson('/api/v1/jobs', $this->payload([
            'department_id' => $department->id,
            'recruiter_ids' => [$recruiter->id],
        ]))->assertCreated();

        $response
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.department.name', 'Engineering')
            ->assertJsonPath('data.recruiters.0.id', $recruiter->id)
            ->assertJsonCount(2, 'data.skills')
            ->assertJsonPath('data.available_transitions', ['published', 'archived']);

        $this->assertDatabaseHas('job_postings', ['company_id' => $company->id, 'title' => 'Senior Laravel Developer', 'created_by' => $hr->id]);
        $this->assertDatabaseHas('audit_logs', ['company_id' => $company->id, 'event' => 'job.created']);
    }

    public function test_foreign_department_and_recruiter_ids_are_rejected(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [$companyB, $adminB] = $this->companyWithAdmin();
        $foreignDepartment = app(TenantContext::class)->runAs($companyB, fn () => Department::create(['name' => 'Secret']));
        Sanctum::actingAs($adminA);

        $this->postJson('/api/v1/jobs', $this->payload([
            'department_id' => $foreignDepartment->id,
            'recruiter_ids' => [$adminB->id],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['department_id', 'recruiter_ids.0']);
    }

    public function test_validation_rejects_inverted_salary_range_and_past_expiry(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/jobs', $this->payload([
            'salary_min' => 80000,
            'salary_max' => 50000,
            'expires_at' => now()->subDay()->toIso8601String(),
        ]))->assertUnprocessable()->assertJsonValidationErrors(['salary_max', 'expires_at']);
    }

    public function test_interviewers_cannot_see_or_create_jobs(): void
    {
        [$company] = $this->companyWithAdmin();
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        Sanctum::actingAs($interviewer);

        $this->getJson('/api/v1/jobs')->assertForbidden();
        $this->postJson('/api/v1/jobs', $this->payload())->assertForbidden();
    }

    public function test_jobs_of_other_companies_are_invisible(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        $this->makeJob($companyA, ['title' => 'Mine']);
        $foreign = $this->makeJob($companyB, ['title' => 'Theirs']);
        Sanctum::actingAs($adminA);

        $this->getJson('/api/v1/jobs')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Mine');
        $this->getJson('/api/v1/jobs/'.$foreign->id)->assertNotFound();
        $this->putJson('/api/v1/jobs/'.$foreign->id, ['title' => 'Hijacked'])->assertNotFound();
        $this->postJson('/api/v1/jobs/'.$foreign->id.'/publish')->assertNotFound();
        $this->deleteJson('/api/v1/jobs/'.$foreign->id)->assertNotFound();
    }

    public function test_lifecycle_transitions_are_enforced(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $job = $this->makeJob($company);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/jobs/{$job->id}/pause")->assertStatus(409)->assertJsonPath('code', 'INVALID_JOB_TRANSITION');
        $this->postJson("/api/v1/jobs/{$job->id}/publish")->assertOk()->assertJsonPath('data.status', 'published');
        $this->postJson("/api/v1/jobs/{$job->id}/pause")->assertOk()->assertJsonPath('data.status', 'paused');
        $this->postJson("/api/v1/jobs/{$job->id}/close")->assertOk()->assertJsonPath('data.status', 'closed');
        $this->postJson("/api/v1/jobs/{$job->id}/archive")->assertOk()->assertJsonPath('data.status', 'archived');

        $this->putJson("/api/v1/jobs/{$job->id}", ['title' => 'Too late'])->assertStatus(409)->assertJsonPath('code', 'JOB_NOT_EDITABLE');
        $this->assertDatabaseHas('audit_logs', ['event' => 'job.status_changed', 'company_id' => $company->id]);
    }

    public function test_recruiters_cannot_publish(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $job = $this->makeJob($company);
        Sanctum::actingAs($recruiter);

        $this->postJson("/api/v1/jobs/{$job->id}/publish")->assertForbidden();
    }

    public function test_only_draft_or_archived_jobs_can_be_deleted(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $published = $this->makeJob($company, [], 'published');
        $draft = $this->makeJob($company);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/jobs/{$published->id}")->assertStatus(409)->assertJsonPath('code', 'JOB_NOT_DELETABLE');
        $this->deleteJson("/api/v1/jobs/{$draft->id}")->assertNoContent();
        $this->assertSoftDeleted('job_postings', ['id' => $draft->id]);
    }

    public function test_list_filters_and_sorting(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $this->makeJob($company, ['title' => 'Alpha Engineer']);
        $this->makeJob($company, ['title' => 'Beta Designer'], 'published');
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/jobs?status=published')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Beta Designer');
        $this->getJson('/api/v1/jobs?search=alpha')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/jobs?sort=title')->assertJsonPath('data.0.title', 'Alpha Engineer');
        $this->getJson('/api/v1/jobs?sort=password')->assertUnprocessable();
    }

    public function test_expired_jobs_are_closed_by_the_scheduler_command(): void
    {
        [$company] = $this->companyWithAdmin();
        $expired = $this->makeJob($company, [], 'published');
        $expired->forceFill(['expires_at' => now()->subMinute()])->saveQuietly();
        $active = $this->makeJob($company, [], 'published');

        $this->artisan('jobs:close-expired')->assertSuccessful();

        $this->assertDatabaseHas('job_postings', ['id' => $expired->id, 'status' => 'closed']);
        $this->assertDatabaseHas('job_postings', ['id' => $active->id, 'status' => 'published']);
    }
}
