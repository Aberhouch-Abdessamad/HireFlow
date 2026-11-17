<?php

namespace Tests\Feature\Dashboard;

use App\Enums\SystemRole;
use App\Models\User;
use App\Services\Interviews\InterviewService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_workspace_only_counts_the_members_own_work(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $colleague = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);

        $mine = $this->makeApplication($company);
        $stale = $this->makeApplication($company);
        $theirs = $this->makeApplication($company);

        $tenant = app(TenantContext::class);
        $tenant->runAs($company, function () use ($mine, $stale, $theirs, $recruiter, $colleague): void {
            $mine->forceFill(['assigned_to' => $recruiter->id, 'applied_at' => now()->subDay(), 'stage_entered_at' => now()->subDay()])->save();
            $stale->forceFill(['assigned_to' => $recruiter->id, 'applied_at' => now()->subDays(20), 'stage_entered_at' => now()->subDays(12)])->save();
            $theirs->forceFill(['assigned_to' => $colleague->id])->save();
            $mine->jobPosting->recruiters()->sync([$recruiter->id]);
        });

        $tenant->runAs($company, fn () => app(InterviewService::class)->schedule($mine, [
            'type' => 'technical',
            'scheduled_at' => now()->addDays(2)->setTime(10, 0)->toIso8601String(),
            'duration_minutes' => 60,
            'location' => 'Room 1',
            'participant_ids' => [$recruiter->id],
        ], $admin));

        Sanctum::actingAs($recruiter);
        $response = $this->getJson('/api/v1/dashboard/workspace')
            ->assertOk()
            ->assertJsonPath('data.kpi.assigned_active', 2)
            ->assertJsonPath('data.kpi.new_this_week', 1)
            ->assertJsonPath('data.kpi.stale', 1)
            ->assertJsonPath('data.kpi.interviews_this_week', 1)
            ->assertJsonPath('data.kpi.pending_feedback', 0)
            ->assertJsonPath('data.needs_attention.0.id', $stale->id)
            ->assertJsonCount(1, 'data.needs_attention')
            ->assertJsonCount(1, 'data.agenda')
            ->assertJsonPath('data.jobs.0.id', $mine->job_posting_id);

        $this->assertSame(2, collect($response->json('data.pipeline'))->sum('count'));

        // A colleague sees only their own application, and nothing of the recruiter's agenda.
        Sanctum::actingAs($colleague);
        $this->getJson('/api/v1/dashboard/workspace')
            ->assertOk()
            ->assertJsonPath('data.kpi.assigned_active', 1)
            ->assertJsonCount(0, 'data.agenda');
    }

    public function test_interviewers_without_application_access_are_forbidden(): void
    {
        [$company] = $this->companyWithAdmin();
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);

        Sanctum::actingAs($interviewer);
        $this->getJson('/api/v1/dashboard/workspace')->assertForbidden();
    }

    public function test_guests_are_rejected(): void
    {
        $this->getJson('/api/v1/dashboard/workspace')->assertUnauthorized();
    }
}
