<?php

namespace App\Services\Analytics;

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Enums\MembershipStatus;
use App\Enums\PermissionName;
use App\Enums\StageType;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Chart data for the /analytics/* endpoints. All aggregates run as portable SQL
 * (no database-specific date functions); month buckets are built in PHP and
 * zero-filled so chart series are continuous. Months are UTC calendar months.
 */
final class AnalyticsService
{
    /**
     * GET /analytics/applications — applications, hires and rejections per month
     * (by application date) for the selected range.
     *
     * @return list<array{month: string, applications: int, hired: int, rejected: int}>
     */
    public function applicationsPerMonth(Company $company, Carbon $from, Carbon $to): array
    {
        $rows = DB::table('applications')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->whereBetween('applied_at', [$from, $to])
            ->get(['applied_at', 'status']);

        $counts = [];
        foreach ($rows as $row) {
            $month = substr((string) $row->applied_at, 0, 7);
            $counts[$month]['applications'] = ($counts[$month]['applications'] ?? 0) + 1;

            if ($row->status === ApplicationStatus::Hired->value) {
                $counts[$month]['hired'] = ($counts[$month]['hired'] ?? 0) + 1;
            } elseif ($row->status === ApplicationStatus::Rejected->value) {
                $counts[$month]['rejected'] = ($counts[$month]['rejected'] ?? 0) + 1;
            }
        }

        return $this->fillMonths($from, $to, fn (string $month): array => [
            'month' => $month,
            'applications' => $counts[$month]['applications'] ?? 0,
            'hired' => $counts[$month]['hired'] ?? 0,
            'rejected' => $counts[$month]['rejected'] ?? 0,
        ]);
    }

    /**
     * GET /analytics/hiring-funnel — how many applications (applied within the
     * range) ever reached each stage type (cumulative, read from the append-only
     * stage history), the current stage distribution (candidates by stage) and
     * the status split.
     *
     * @return array<string, mixed>
     */
    public function hiringFunnel(Company $company, Carbon $from, Carbon $to): array
    {
        $statuses = array_fill_keys(array_map(fn (ApplicationStatus $s): string => $s->value, ApplicationStatus::cases()), 0);
        foreach ($this->appliedInRange($company, $from, $to)->groupBy('status')->selectRaw('status, count(*) as total')->get() as $row) {
            $statuses[$row->status] = (int) $row->total;
        }

        $reached = [];
        foreach ($this->stagesReached($company, $from, $to) as $row) {
            $reached[$row->stage_type] = (int) $row->total;
        }
        $funnel = [];
        foreach (StageType::cases() as $type) {
            $funnel[] = [
                'stage_type' => $type->value,
                'applications' => $reached[$type->value] ?? 0,
            ];
        }

        $stages = $this->appliedInRange($company, $from, $to)
            ->join('recruitment_stages as s', 's.id', '=', 'applications.current_stage_id')
            ->groupBy('s.id', 's.name', 's.position')
            ->orderBy('s.position')
            ->selectRaw('s.id, s.name, s.position, count(*) as total')
            ->get()
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'position' => (int) $row->position,
                'applications' => (int) $row->total,
            ])
            ->all();

        return [
            'funnel' => $funnel,
            'stages' => $stages,
            'statuses' => $statuses,
        ];
    }

    /**
     * GET /analytics/jobs — jobs per department (total, published and
     * applications received in the range) plus the job status split. Jobs
     * without a department land in an "Unassigned" bucket.
     *
     * @return array<string, mixed>
     */
    public function jobsByDepartment(Company $company, Carbon $from, Carbon $to): array
    {
        $jobs = $published = $received = [];

        foreach ($this->jobRows($company)->get(['department_id', 'status']) as $row) {
            $key = $this->bucket($row->department_id);
            $jobs[$key] = ($jobs[$key] ?? 0) + 1;
            if ($row->status === JobStatus::Published->value) {
                $published[$key] = ($published[$key] ?? 0) + 1;
            }
        }

        foreach (
            DB::table('applications as a')
                ->join('job_postings as j', 'j.id', '=', 'a.job_posting_id')
                ->where('a.company_id', $company->id)
                ->whereNull('a.deleted_at')
                ->whereBetween('a.applied_at', [$from, $to])
                ->get(['j.department_id']) as $row
        ) {
            $key = $this->bucket($row->department_id);
            $received[$key] = ($received[$key] ?? 0) + 1;
        }

        $byDepartment = [];
        foreach (DB::table('departments')->where('company_id', $company->id)->orderBy('name')->get(['id', 'name']) as $department) {
            $byDepartment[] = [
                'department_id' => (int) $department->id,
                'name' => $department->name,
                'jobs' => $jobs[$department->id] ?? 0,
                'published_jobs' => $published[$department->id] ?? 0,
                'applications' => $received[$department->id] ?? 0,
            ];
        }

        if (isset($jobs['unassigned']) || isset($received['unassigned'])) {
            $byDepartment[] = [
                'department_id' => null,
                'name' => 'Unassigned',
                'jobs' => $jobs['unassigned'] ?? 0,
                'published_jobs' => $published['unassigned'] ?? 0,
                'applications' => $received['unassigned'] ?? 0,
            ];
        }

        $byStatus = array_fill_keys(array_map(fn (JobStatus $s): string => $s->value, JobStatus::cases()), 0);
        foreach ($this->jobRows($company)->groupBy('status')->selectRaw('status, count(*) as total')->get() as $row) {
            $byStatus[$row->status] = (int) $row->total;
        }

        return [
            'by_department' => $byDepartment,
            'by_status' => $byStatus,
        ];
    }

    /**
     * GET /analytics/recruiters — pipeline work per user in the range:
     * applications assigned to them, hires among those, interviews they booked
     * and offers they created. Lists everyone who can be assigned applications
     * in this company plus any other user who shows up in the metrics.
     *
     * @return list<array<string, int|string>>
     */
    public function recruiterPerformance(Company $company, Carbon $from, Carbon $to): array
    {
        $assigned = $hired = $booked = $created = [];

        foreach (
            DB::table('applications')
                ->where('company_id', $company->id)
                ->whereNull('deleted_at')
                ->whereBetween('applied_at', [$from, $to])
                ->whereNotNull('assigned_to')
                ->get(['assigned_to', 'status']) as $row
        ) {
            $assigned[$row->assigned_to] = ($assigned[$row->assigned_to] ?? 0) + 1;
            if ($row->status === ApplicationStatus::Hired->value) {
                $hired[$row->assigned_to] = ($hired[$row->assigned_to] ?? 0) + 1;
            }
        }

        foreach ($this->activityRows($company, 'interviews', 'scheduled_by', $from, $to) as $row) {
            $booked[$row->user_id] = (int) $row->total;
        }
        foreach ($this->activityRows($company, 'offers', 'created_by', $from, $to) as $row) {
            $created[$row->user_id] = (int) $row->total;
        }

        // Assignable members first, then anyone with activity in the metrics.
        $recruiterIds = User::query()
            ->where('is_active', true)
            ->whereHas('memberships', fn ($query) => $query
                ->where('company_id', $company->id)
                ->where('status', MembershipStatus::Active->value))
            ->permission(PermissionName::ApplicationsAssign->value)
            ->pluck('id')
            ->all();

        $ids = array_values(array_unique(array_merge(
            $recruiterIds,
            array_keys($assigned),
            array_keys($booked),
            array_keys($created),
        )));

        $users = User::query()->whereKey($ids)->orderBy('name')->get(['id', 'name']);

        return $users
            ->map(fn (User $user): array => [
                'user_id' => $user->id,
                'name' => $user->name,
                'assigned' => $assigned[$user->id] ?? 0,
                'hired' => $hired[$user->id] ?? 0,
                'interviews_scheduled' => $booked[$user->id] ?? 0,
                'offers_created' => $created[$user->id] ?? 0,
                'is_recruiter' => in_array($user->id, $recruiterIds, true),
            ])
            ->values()
            ->all();
    }

    /**
     * GET /analytics/time-to-hire — average applied_at → hired_at duration for
     * hires in the range, overall, per month (by hire date) and per job department.
     *
     * @return array<string, mixed>
     */
    public function timeToHire(Company $company, Carbon $from, Carbon $to): array
    {
        $hires = DB::table('applications as a')
            ->join('job_postings as j', 'j.id', '=', 'a.job_posting_id')
            ->leftJoin('departments as d', 'd.id', '=', 'j.department_id')
            ->where('a.company_id', $company->id)
            ->whereNull('a.deleted_at')
            ->whereBetween('a.hired_at', [$from, $to])
            ->whereNotNull('a.applied_at')
            ->get(['a.applied_at', 'a.hired_at', 'j.department_id', 'd.name as department']);

        $durations = $hires
            ->map(fn (object $hire): array => [
                'days' => (float) Carbon::parse((string) $hire->applied_at)->diffInDays(Carbon::parse((string) $hire->hired_at)),
                'month' => substr((string) $hire->hired_at, 0, 7),
                'department_key' => $this->bucket($hire->department_id),
                'department' => $hire->department ?? 'Unassigned',
            ])
            ->all();

        $byMonth = [];
        foreach ($durations as $hire) {
            $byMonth[$hire['month']][] = $hire['days'];
        }

        $perMonth = $this->fillMonths($from, $to, fn (string $month): array => [
            'month' => $month,
            'hires' => count($byMonth[$month] ?? []),
            'average_days' => isset($byMonth[$month]) ? round($this->average($byMonth[$month]), 1) : null,
        ]);

        $byDepartment = [];
        foreach ($durations as $hire) {
            $byDepartment[$hire['department_key']]['name'] ??= $hire['department'];
            $byDepartment[$hire['department_key']]['days'][] = $hire['days'];
        }

        $perDepartment = [];
        foreach ($byDepartment as $key => $bucket) {
            $perDepartment[] = [
                'department_id' => $key === 'unassigned' ? null : (int) $key,
                'name' => $bucket['name'],
                'hires' => count($bucket['days']),
                'average_days' => round($this->average($bucket['days']), 1),
            ];
        }

        usort($perDepartment, fn (array $a, array $b): int => strcmp($a['name'], $b['name']));

        return [
            'average_days' => $durations === [] ? null : round($this->average(array_column($durations, 'days')), 1),
            'hires' => count($durations),
            'per_month' => $perMonth,
            'per_department' => $perDepartment,
        ];
    }

    /**
     * Base query for applications applied within the range.
     *
     * @return Builder
     */
    private function appliedInRange(Company $company, Carbon $from, Carbon $to)
    {
        return DB::table('applications')
            ->where('applications.company_id', $company->id)
            ->whereNull('applications.deleted_at')
            ->whereBetween('applications.applied_at', [$from, $to]);
    }

    /** @return Builder */
    private function jobRows(Company $company)
    {
        return DB::table('job_postings')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at');
    }

    /** @return Builder */
    private function activityRows(Company $company, string $table, string $column, Carbon $from, Carbon $to)
    {
        return DB::table($table)
            ->where('company_id', $company->id)
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull($column)
            ->groupBy($column)
            ->selectRaw("{$column} as user_id, count(*) as total")
            ->get();
    }

    /**
     * Counts, per stage type, the DISTINCT applications (applied within the
     * range) that ever entered a stage of that type. That is a cumulative
     * funnel: an application rejected from an interview stage still counts.
     *
     * @return Collection<int, object>
     */
    private function stagesReached(Company $company, Carbon $from, Carbon $to)
    {
        return DB::table('application_stage_history as h')
            ->join('recruitment_stages as s', 's.id', '=', 'h.to_stage_id')
            ->join('applications as a', 'a.id', '=', 'h.application_id')
            ->where('a.company_id', $company->id)
            ->whereNull('a.deleted_at')
            ->whereBetween('a.applied_at', [$from, $to])
            ->groupBy('s.type')
            ->selectRaw('s.type as stage_type, count(distinct a.id) as total')
            ->get();
    }

    /** Maps a nullable department id to a stable array key ('unassigned' for NULL). */
    private function bucket(mixed $departmentId): int|string
    {
        return $departmentId === null ? 'unassigned' : (int) $departmentId;
    }

    /** Builds zero-filled "Y-m" months between the range bounds, in order. */
    private function fillMonths(Carbon $from, Carbon $to, callable $build): array
    {
        $months = [];
        $cursor = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();

        while ($cursor->lessThanOrEqualTo($end)) {
            $months[] = $build($cursor->format('Y-m'));
            $cursor->addMonth();
        }

        return $months;
    }

    /** @param  list<float>  $values */
    private function average(array $values): float
    {
        return array_sum($values) / max(count($values), 1);
    }
}
