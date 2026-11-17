<?php

namespace App\Services\Analytics;

use App\Enums\ApplicationStatus;
use App\Enums\InterviewStatus;
use App\Enums\JobStatus;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Company;
use App\Models\Interview;
use App\Models\JobPosting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * KPI cards for GET /dashboard/overview. Everything is computed from the
 * database — no hardcoded values (Module 9).
 *
 * Stock metrics (jobs, candidates, applications, interviews, hires) are
 * company-wide totals; rate metrics (rejection, conversion, time to hire)
 * look at applications within the selected date range.
 */
final class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function overview(Company $company, Carbon $from, Carbon $to, string $preset): array
    {
        $inRange = $this->rangeStats($company, $from, $to);
        $total = (int) $inRange->total;

        return [
            'kpi' => [
                'active_jobs' => JobPosting::forCompany($company)
                    ->where('status', JobStatus::Published->value)
                    ->count(),
                'total_candidates' => Candidate::forCompany($company)->count(),
                'total_applications' => Application::forCompany($company)->count(),
                'scheduled_interviews' => Interview::forCompany($company)
                    ->where('status', InterviewStatus::Scheduled->value)
                    ->where('scheduled_at', '>=', now())
                    ->count(),
                'candidates_hired' => Application::forCompany($company)
                    ->where('status', ApplicationStatus::Hired->value)
                    ->count(),
                'rejection_rate' => $total > 0
                    ? round($inRange->rejected / $total * 100, 1)
                    : null,
                'conversion_rate' => $total > 0
                    ? round($inRange->hired / $total * 100, 1)
                    : null,
                'avg_time_to_hire_days' => $this->averageTimeToHire($company, $from, $to),
            ],
            'range' => [
                'preset' => $preset,
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
        ];
    }

    /**
     * Status totals for applications applied within the range.
     *
     * @return object{total: int, rejected: int, hired: int}
     */
    private function rangeStats(Company $company, Carbon $from, Carbon $to): object
    {
        $stats = DB::table('applications')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->whereBetween('applied_at', [$from, $to])
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status = '".ApplicationStatus::Rejected->value."' then 1 else 0 end) as rejected")
            ->selectRaw("sum(case when status = '".ApplicationStatus::Hired->value."' then 1 else 0 end) as hired")
            ->first();

        return (object) [
            'total' => (int) ($stats->total ?? 0),
            'rejected' => (int) ($stats->rejected ?? 0),
            'hired' => (int) ($stats->hired ?? 0),
        ];
    }

    /** Average days between applied_at and hired_at for hires in the range, or null. */
    private function averageTimeToHire(Company $company, Carbon $from, Carbon $to): ?float
    {
        $hires = DB::table('applications')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->whereBetween('hired_at', [$from, $to])
            ->whereNotNull('applied_at')
            ->get(['applied_at', 'hired_at']);

        if ($hires->isEmpty()) {
            return null;
        }

        $days = $hires
            ->map(fn (object $hire): float => Carbon::parse((string) $hire->applied_at)->diffInDays(Carbon::parse((string) $hire->hired_at)))
            ->filter(fn (float $days): bool => $days > 0);

        return $days->isEmpty() ? null : round((float) $days->avg(), 1);
    }
}
