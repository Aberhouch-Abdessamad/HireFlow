<?php

namespace App\Http\Middleware;

use App\Exceptions\AccountDeactivatedException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects deactivated accounts on every authenticated request, even if a session was opened
 * before the account was deactivated, and ends that session.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            throw new AccountDeactivatedException;
        }

        return $next($request);
    }
}
