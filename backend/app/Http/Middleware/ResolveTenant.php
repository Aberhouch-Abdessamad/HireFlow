<?php

namespace App\Http\Middleware;

use App\Exceptions\NoActiveCompanyException;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the active company for an authenticated request.
 *
 * The company always comes from the user's stored selection (users.current_company_id),
 * re-checked against an *active* membership in an *active* company. A company id in the
 * request body, query string or headers is never used. If the stored selection is no longer
 * valid, the user's first active membership is used instead and saved.
 *
 * It also scopes Spatie Permission to the company, so role and permission checks use the
 * user's role in this company only.
 *
 * Usage: `tenant` (a company is required) or `tenant:optional` (continue without one, e.g. /auth/me).
 */
class ResolveTenant
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            throw new AuthenticationException;
        }

        $membership = $user->current_company_id !== null
            ? $user->activeMembershipIn($user->current_company_id)
            : null;

        $membership ??= $user->firstActiveMembership();

        if ($membership === null) {
            if ($mode === 'optional') {
                return $next($request);
            }

            throw new NoActiveCompanyException;
        }

        if ($user->current_company_id !== $membership->company_id) {
            $user->forceFill(['current_company_id' => $membership->company_id])->saveQuietly();
        }

        $this->tenant->set($membership->company);
        setPermissionsTeamId($membership->company_id);

        // Roles may already be loaded under another team (e.g. during tests): reload for this company.
        $user->unsetRelation('roles')->unsetRelation('permissions');

        return $next($request);
    }
}
