<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Enums\PermissionName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Analytics\DateRangeRequest;
use App\Services\Analytics\AnalyticsService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /analytics/applications — applications/hires/rejections per month. */
    public function applications(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to] = $request->period();

        return response()->json([
            'data' => $this->analytics->applicationsPerMonth($this->tenant->company(), $from, $to),
        ]);
    }

    /** GET /analytics/hiring-funnel — cumulative funnel, stage distribution, status split. */
    public function hiringFunnel(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to] = $request->period();

        return response()->json([
            'data' => $this->analytics->hiringFunnel($this->tenant->company(), $from, $to),
        ]);
    }

    /** GET /analytics/jobs — jobs per department and per status. */
    public function jobs(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to] = $request->period();

        return response()->json([
            'data' => $this->analytics->jobsByDepartment($this->tenant->company(), $from, $to),
        ]);
    }

    /** GET /analytics/recruiters — pipeline output per user. */
    public function recruiters(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to] = $request->period();

        return response()->json([
            'data' => $this->analytics->recruiterPerformance($this->tenant->company(), $from, $to),
        ]);
    }

    /** GET /analytics/time-to-hire — average applied → hired duration. */
    public function timeToHire(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to] = $request->period();

        return response()->json([
            'data' => $this->analytics->timeToHire($this->tenant->company(), $from, $to),
        ]);
    }
}
