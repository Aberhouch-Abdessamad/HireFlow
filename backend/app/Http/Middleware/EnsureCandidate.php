<?php

namespace App\Http\Middleware;

use App\Exceptions\BusinessRuleException;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Restricts candidate-portal routes to candidate accounts. */
class EnsureCandidate
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->isCandidate()) {
            throw new BusinessRuleException('This area is for candidate accounts.', 'NOT_A_CANDIDATE', 403);
        }

        return $next($request);
    }
}
