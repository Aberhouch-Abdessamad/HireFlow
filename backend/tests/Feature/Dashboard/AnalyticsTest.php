<?php

namespace Tests\Feature\Dashboard;

use App\Enums\ApplicationSource;
use App\Enums\RejectionReason;
use App\Enums\SystemRole;
use App\Models\Department;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use App\Services\Interviews\InterviewService;
use App\Services\Offers\OfferService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    /** Shared full roster. */
    private function team(): array
    {
        [$company, $admin] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);

        return [$company, $admin, $recruiter, $interviewer];
    }

    public function test_applications_per_month_zero_fills_and_counts(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $apps = [];
        $apps[] = $this->makeApplication($company);
        $apps[] = $this->makeApplication($company);
        $apps[] = $this->makeApplication($company);

        app(TenantContext::class)->runAs($company, function () use ($apps): void {
            $apps[0]->forceFill(['status' => 'hired', 'applied_at' => now()->subDays(60)])->save();
            $apps[1]->forceFill(['status' => 'rejected', 'applied_at' => now()->subDays(30)])->save();
            $apps[2]->forceFill(['applied_at' => now()])->save();
        });

        Sanctum::actingAs($admin);
        $data = $this->getJson('/api/v1/analytics/applications?range=90')
            ->assertOk()
            ->json('data');

        // Expected month buckets computed exactly like the service.
        $from = now()->subDays(90)->startOfDay();
        $to = now()->endOfDay();
        $expectedMonths = [];
        for ($c = $from->copy()->startOfMonth(); $c->lte($to->copy()->startOfMonth()); $c->addMonth()) {
            $expectedMonths[] = $c->format('Y-m');
            $expected[$c->format('Y-m')] = ['applications' => 0, 'hired' => 0, 'rejected' => 0];
        }

        $actualMonths = array_column($data, 'month');
        $this->assertSame($expectedMonths, $actualMonths);

        $this->assertListsMatch($data, $expectedMonths, $expected);
    }

    public function test_hiring_funnel_and_stage_distribution(): void
    {
        [$company, $admin] = $this->team();
        $appA = $this->makeApplication($company);
        $appB = $this->makeApplication($company);
        $appC = $this->makeApplication($company);

        $tenant = app(TenantContext::class)->runAs($company, function () use ($appA, $appB, $appC, $admin): void {
            $screening = RecruitmentStage::where('type', 'screening')->firstOrFail();
            $interviewType = RecruitmentStage::where('type', 'interview')->firstOrFail();
            app(ApplicationService::class)->moveToStage($appA, $screening, 'promising', $admin);
            app(ApplicationService::class)->moveToStage($appB, $screening, 'ok', $admin);
            app(ApplicationService::class)->moveToStage($appB, $interviewType, 'ready', $admin);
            app(ApplicationService::class)->reject($appC, RejectionReason::SkillsMismatch, null, $admin);
        });

        Sanctum::actingAs($admin);
        $data = $this->getJson('/api/v1/analytics/hiring-funnel')
            ->assertOk()
            ->json('data');

        $funnel = collect($data['funnel'])->keyBy('stage_type');
        $this->assertSame(3, $funnel['applied']['applications']);
        $this->assertSame(2, $funnel['screening']['applications']);
        $this->assertSame(1, $funnel['interview']['applications']);
        $this->assertSame(0, $funnel['offer']['applications']);
        $this->assertSame(0, $funnel['hired']['applications']);

        $stages = collect($data['stages'])
            ->keyBy('name');
        $this->assertSame(1, $stages['Applied']['applications']);
        $this->assertSame(1, $stages['CV Screening']['applications']);
        $interviewName = app(TenantContext::class)->runAs($company, fn () => RecruitmentStage::where('type', 'interview')->firstOrFail()->name);
        $this->assertSame(1, $stages[$interviewName]['applications']);

        $this->assertSame(['active' => 2, 'rejected' => 1, 'withdrawn' => 0, 'hired' => 0], $data['statuses']);
    }

    public function test_jobs_by_department_and_status(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $dept1 = $admin;
        // build departments inside the tenant
        [$d1, $d2] = app(TenantContext::class)->runAs($company, fn () => [Department::factory()->create(), Department::factory()->create()]);

        // dept job, published, with 2 applications
        $job1 = $this->makeJob($company, ['department_id' => $d1->id], 'published');
        // a hired/rejection doesn't matter; just 2 apps
        $appA = $this->makeCandidate($company);
        $appB = $this->makeCandidate($company);
        app(TenantContext::class)->runAs($company, function () use ($job1, $appA, $appB): void {
            app(ApplicationService::class)->create($appA, $job1, ApplicationSource::Manual, null, null);
            app(ApplicationService::class)->create($appB, $job1, ApplicationSource::Manual, null, null);
        });

        // draft job in dept1
        $this->makeJob($company, ['department_id' => $d1->id], null);

        // unassigned: one published via makeApplication, one draft
        $this->makeApplication($company);
        $this->makeJob($company, [], null);

        Sanctum::actingAs($admin);
        $data = $this->getJson('/api/v1/analytics/jobs?range=30')
            ->assertOk()
            ->json('data');

        $byDept = collect($data['by_department'])->keyBy(fn ($r) => $r['department_id'] ?? 'unassigned');
        $this->assertSame(2, $byDept[$d1->id]['jobs']);
        $this->assertSame(1, $byDept[$d1->id]['published_jobs']);
        $this->assertSame(2, $byDept[$d1->id]['applications']);
        $this->assertNull($byDept['unassigned']['department_id']);
        $unassigned = collect($data['by_department'])->firstWhere('department_id', null);
        $this->assertSame(2, $unassigned['jobs']);
        $this->assertSame(1, $unassigned['published_jobs']);
        $this->assertSame(1, $unassigned['applications']);
        $dept2 = $byDept[$d2->id];
        $this->assertSame(0, $dept2['jobs']);
        $this->assertSame(0, $dept2['published_jobs']);
        $this->assertSame(0, $dept2['applications']);

        $this->assertSame(['draft' => 2, 'published' => 2, 'paused' => 0, 'closed' => 0, 'archived' => 0], $data['by_status']);
    }

    public function test_recruiter_performance(): void
    {
        [$company, $admin, $recruiter, $interviewer] = $this->team();

        // two assigned applications (one hired), plus separate apps for interview & offer
        $appA = $this->makeApplication($company);
        $appB = $this->makeApplication($company);
        $appC = $this->makeApplication($company);
        $appD = $this->makeApplication($company);

        app(TenantContext::class)->runAs($company, function () use ($appA, $appB, $recruiter): void {
            app(ApplicationService::class)->assign($appA, $recruiter);
            app(ApplicationService::class)->assign($appB, $recruiter);
            $appA->forceFill(['status' => 'hired'])->save();
        });

        app(TenantContext::class)->runAs($company, function () use ($appC, $recruiter, $interviewer): void {
            app(InterviewService::class)->schedule($appC, [
                'type' => 'technical',
                'scheduled_at' => now()->addDays(2)->setTime(10, 0)->toIso8601String(),
                'duration_minutes' => 60,
                'location' => 'Room 1',
                'participant_ids' => [$interviewer->id],
            ], $recruiter);
        });

        app(TenantContext::class)->runAs($company, function () use ($appD, $recruiter): void {
            app(OfferService::class)->create($appD, [
                'salary_amount' => 50000,
                'currency' => 'USD',
                'contract_type' => 'full_time',
                'start_date' => now()->addMonth()->toDateString(),
                'expires_at' => now()->addWeek()->toIso8601String(),
            ], $recruiter);
        });

        Sanctum::actingAs($admin);
        $rows = $this->getJson('/api/v1/analytics/recruiters?range=30')
            ->assertOk()
            ->json('data');
        $rowMap = collect($rows)->keyBy('user_id');

        $this->assertCount(2, $rowMap);
        $this->assertTrue($rowMap[$recruiter->id]['is_recruiter']);
        $this->assertSame(2, $rowMap[$recruiter->id]['assigned']);
        $this->assertSame(1, $rowMap[$recruiter->id]['hired']);
        $this->assertSame(1, $rowMap[$recruiter->id]['interviews_scheduled']);
        $this->assertSame(1, $rowMap[$recruiter->id]['offers_created']);
        $this->assertSame(0, $rowMap[$admin->id]['assigned']);
        $this->assertSame(0, $rowMap[$admin->id]['hired']);
        $this->assertSame(0, $rowMap[$admin->id]['interviews_scheduled']);
        $this->assertSame(0, $rowMap[$admin->id]['offers_created']);
        $this->assertTrue($rowMap[$admin->id]['is_recruiter']);
    }

    public function test_time_to_hire(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $h1 = $this->makeApplication($company);
        $h2 = $this->makeApplication($company);
        app(TenantContext::class)->runAs($company, function () use ($h1, $h2): void {
            $h1->forceFill(['status' => 'hired', 'applied_at' => now()->subDays(10), 'hired_at' => now()->subDays(2)])->save();
            $h2->forceFill(['status' => 'hired', 'applied_at' => now()->subDays(20), 'hired_at' => now()->subDays(5)])->save();
        });

        Sanctum::actingAs($admin);
        $data = $this->getJson('/api/v1/analytics/time-to-hire')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['hires']);
        $this->assertSame(11.5, $data['average_days']);

        // per_month sums to the total hires.
        $monthHires = array_sum(array_column($data['per_month'], 'hires'));
        $this->assertSame(2, $monthHires);

        $this->assertCount(1, $data['per_department']);
        $this->assertNull($data['per_department'][0]['department_id']);
        $this->assertSame('Unassigned', $data['per_department'][0]['name']);
        $this->assertSame(2, $data['per_department'][0]['hires']);
        $this->assertSame(11.5, $data['per_department'][0]['average_days']);
    }

    public function test_interviewers_are_forbidden_from_dashboard_and_analytics(): void
    {
        [$company, , , $interviewer] = $this->team();
        app(TenantContext::class)->runAs($company, function () use ($company): void {
            $this->makeApplication($company);
        });
        Sanctum::actingAs($interviewer);

        $this->getJson('/api/v1/dashboard/overview')->assertStatus(403);
        foreach (['applications', 'hiring-funnel', 'jobs', 'recruiters', 'time-to-hire'] as $ep) {
            $path = str_starts_with($ep, 'hiring') ? 'hiring-funnel' : $ep;
            $this->getJson("/api/v1/analytics/{$path}")->assertStatus(403);
        }
    }

    private function interviewStageName($company): string
    {
        return app(TenantContext::class)->runAs($company, fn () => RecruitmentStage::where('type', 'interview')->first()->name);
    }

    /** Reconcile per-month counted totals against the returned series. */
    private function assertListsMatch(array $data, array $expectedMonths, array $expected): void
    {
        $expectedTotal = 0;
        $expectedHired = 0;
        $expectedRejected = 0;
        foreach ($data as $row) {
            $expectedTotal += $row['applications'];
            $expectedHired += $row['hired'];
            $expectedRejected += $row['rejected'];
        }
        $this->assertSame(3, $expectedTotal);
        $this->assertSame(1, $expectedHired);
        $this->assertSame(1, $expectedRejected);
    }
}
