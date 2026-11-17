<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\MembershipStatus;
use App\Enums\PermissionName;
use App\Enums\SystemRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignableUserController extends Controller
{
    /**
     * GET /company/recruiters: active members who can own a job
     * (Company Admin, HR Manager or Recruiter in this company).
     */
    public function recruiters(Request $request, TenantContext $tenant): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless(
            $actor->checkPermissionTo(PermissionName::JobsCreate->value) || $actor->checkPermissionTo(PermissionName::JobsUpdate->value),
            403,
        );

        $roles = [SystemRole::CompanyAdmin->value, SystemRole::HrManager->value, SystemRole::Recruiter->value];

        $users = User::query()
            ->where('is_active', true)
            ->whereHas('memberships', fn ($q) => $q->where('company_id', $tenant->id())->where('status', MembershipStatus::Active->value))
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $roles))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json(['data' => $users]);
    }

    /** GET /company/interviewers: active members who can take part in interviews. */
    public function interviewers(Request $request, TenantContext $tenant): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless($actor->checkPermissionTo(PermissionName::InterviewsSchedule->value), 403);

        $users = User::query()
            ->where('is_active', true)
            ->whereHas('memberships', fn ($q) => $q->where('company_id', $tenant->id())->where('status', MembershipStatus::Active->value))
            ->with(['roles', 'permissions'])
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->filter(fn (User $user) => $user->checkPermissionTo(PermissionName::InterviewsSubmitFeedback->value))
            ->values();

        return response()->json(['data' => $users->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->roles->first()?->name,
        ])]);
    }
}
