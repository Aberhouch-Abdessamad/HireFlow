<?php

namespace Tests\Feature\Dashboard;

use App\Enums\SystemRole;
use App\Models\Application;
use App\Models\Company;
use App\Models\User;
use App\Services\Interviews\InterviewService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_kpis_are_computed_from_real_data(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);

        // Three applications (each spins its own published unassigned job) ...
        $hired = $this->makeApplication($company);
        $rejected = $this->makeApplication($company);
        $active = $this->makeApplication($company);

        // ... then the job of one application is flipped to draft (2 published + 1 draft).
        $this->flipJob($hired->jobPosting, 'draft');

        $tenant = app(TenantContext::class);
        $tenant->runAs($company, function () use ($hired, $rejected): void {
            $hired->forceFill(['status' => 'hired', 'applied_at' => now()->subDays(10), 'hired_at' => now()])->save();
            $rejected->forceFill(['status' => 'rejected', 'applied_at' => now()])->save();
        });

        $tenant->runAs($company, fn () => app(InterviewService::class)->schedule($active, [
            'type' => 'technical',
            'scheduled_at' => now()->addDays(2)->setTime(10, 0)->toIso8601String(),
            'duration_minutes' => 60,
            'location' => 'Room 1',
            'participant_ids' => [$interviewer->id],
        ], $admin));

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('data.kpi.active_jobs', 2)
            ->assertJsonPath('data.kpi.total_candidates', 3)
            ->assertJsonPath('data.kpi.total_applications', 3)
            ->assertJsonPath('data.kpi.scheduled_interviews', 1)
            ->assertJsonPath('data.kpi.candidates_hired', 1)
            ->assertJsonPath('data.kpi.rejection_rate', 33.3)
            ->assertJsonPath('data.kpi.conversion_rate', 33.3)
            ->assertJsonPath('data.kpi.avg_time_to_hire_days', 10.0)
            ->assertJsonPath('data.range.preset', '30');

        // Company isolation: another company's activity does not change company 1's KPIs.
        $this->makeApplication($this->companyWithAdmin()[0]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('data.kpi.total_applications', 3);
    }

    public function test_ranges_filter_rates_and_reject_bad_input(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $today = $this->makeApplication($company); // active, applied now
        $old = $this->makeApplication($company);
        app(TenantContext::class)->runAs($company, function () use ($old): void {
            $old->forceFill(['status' => 'rejected', 'applied_at' => now()->subDays(40)])->save();
        });

        Sanctum::actingAs($admin);

        // Default (30 days): only the "today" application counts -> 0% rejection rate.
        $this->getJson('/api/v1/dashboard/overview')
            ->assertOk()
            ->assertJsonPath('data.kpi.rejection_rate', 0.0)
            ->assertJsonPath('data.kpi.conversion_rate', 0.0);

        $this->getJson('/api/v1/dashboard/overview?range=90')
            ->assertOk()
            ->assertJsonPath('data.kpi.rejection_rate', 50.0);

        // Custom window including the rejected application.
        $fromInclude = now()->subDays(50)->toDateString();
        $toInclude = now()->subDays(30)->toDateString();
        $this->getJson("/api/v1/dashboard/overview?range=custom&from={$fromInclude}&to={$toInclude}")
            ->assertOk()
            ->assertJsonPath('data.kpi.rejection_rate', 100.0)
            ->assertJsonPath('data.kpi.conversion_rate', 0.0);

        // Custom window with no applications in range.
        $fromEmpty = now()->subDays(90)->toDateString();
        $toEmpty = now()->subDays(60)->toDateString();
        $this->getJson("/api/v1/dashboard/overview?range=custom&from={$fromEmpty}&to={$toEmpty}")
            ->assertOk()
            ->assertJsonPath('data.kpi.rejection_rate', null)
            ->assertJsonPath('data.kpi.conversion_rate', null);

        // Validation failures.
        $this->getJson('/api/v1/dashboard/overview?range=bogus')->assertStatus(422);
        $this->getJson('/api/v1/dashboard/overview?range=custom&to='.now()->toDateString())->assertStatus(422);
        $this->getJson('/api/v1/dashboard/overview?range=custom&from='.now()->subDays(10)->toDateString().'&to='.now()->subDays(20)->toDateString())->assertStatus(422);

        // Interviewers may not view the dashboard.
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        Sanctum::actingAs($interviewer);
        $this->getJson('/api/v1/dashboard/overview')->assertStatus(403);
    }

    private function flipJob($job, string $status): void
    {
        app(TenantContext::class)->runAs(
            $job->company,
            fn () => $job->forceFill(['status' => $status])->save(),
        );
    }
}
