<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Auth\SwitchCompanyRequest;
use App\Http\Requests\V1\Auth\UpdateProfileRequest;
use App\Http\Resources\V1\AuthUserResource;
use App\Http\Resources\V1\CompanySummaryResource;
use App\Models\Company;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Company\MembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CurrentUserController extends Controller
{
    /** GET /auth/me */
    public function show(Request $request): AuthUserResource
    {
        return new AuthUserResource($request->user());
    }

    /** PUT /auth/profile */
    public function update(UpdateProfileRequest $request, AuditLogger $audit): AuthUserResource
    {
        /** @var User $user */
        $user = $request->user();
        $old = ['name' => $user->name];
        $user->update($request->validated());
        $audit->record('profile.updated', $user, $old, ['name' => $user->name], $user->current_company_id);

        return new AuthUserResource($user);
    }

    /** GET /auth/companies: companies where the user has an active membership. */
    public function companies(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $companies = Company::query()
            ->where('is_active', true)
            ->whereHas('memberships', static fn ($q) => $q->where('user_id', $user->id)->where('status', 'active'))
            ->orderBy('name')
            ->get();

        return CompanySummaryResource::collection($companies);
    }

    /** POST /company/switch */
    public function switchCompany(SwitchCompanyRequest $request, MembershipService $memberships): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $memberships->switchCompany($user, $request->integer('company_id'));

        return response()->json(['message' => 'Company switched.']);
    }
}
