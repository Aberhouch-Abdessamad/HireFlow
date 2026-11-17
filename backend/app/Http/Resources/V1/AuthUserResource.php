<?php

namespace App\Http\Resources\V1;

use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in user, with roles and permissions for the *active* company only.
 *
 * @mixin User
 */
class AuthUserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $tenant = app(TenantContext::class);
        $hasCompany = $tenant->has();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified' => $this->hasVerifiedEmail(),
            'two_factor_enabled' => $this->two_factor_confirmed_at !== null,
            'is_super_admin' => $this->isSuperAdmin(),
            'is_candidate' => $this->isCandidate(),
            'current_company' => $hasCompany ? new CompanySummaryResource($tenant->company()) : null,
            'roles' => $hasCompany ? $this->getRoleNames()->values()->all() : [],
            'permissions' => $hasCompany ? $this->getAllPermissions()->pluck('name')->sort()->values()->all() : [],
        ];
    }

    /**
     * The current-user payload answers 200 even when the wrapped User model was
     * created moments ago: Laravel's ResourceResponse would otherwise return 201
     * for a model with wasRecentlyCreated set (e.g. registering and immediately
     * requesting GET /auth/me within the same PHP process).
     */
    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->setStatusCode(JsonResponse::HTTP_OK);
    }
}
