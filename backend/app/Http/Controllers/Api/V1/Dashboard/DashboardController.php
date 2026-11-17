<?php

namespace App\Http\Controllers\Api\V1\Dashboard;

use App\Enums\PermissionName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Analytics\DateRangeRequest;
use App\Models\User;
use App\Services\Analytics\DashboardService;
use App\Services\Analytics\WorkspaceService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly WorkspaceService $workspace,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /dashboard/overview?range=today|7|30|90|custom&from=&to= */
    public function overview(DateRangeRequest $request): JsonResponse
    {
        Gate::authorize(PermissionName::AnalyticsView->value);

        ['from' => $from, 'to' => $to, 'preset' => $preset] = $request->period();

        return response()->json([
            'data' => $this->dashboard->overview($this->tenant->company(), $from, $to, $preset),
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * GET /dashboard/workspace: the signed-in member's own work (assigned applications,
     * their interviews, offers they drafted, jobs they recruit for).
     */
    public function workspace(Request $request): JsonResponse
    {
        Gate::authorize(PermissionName::ApplicationsView->value);

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->workspace->forUser($this->tenant->company(), $user),
        ]);
    }
}
