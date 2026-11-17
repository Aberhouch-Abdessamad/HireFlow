<?php

namespace App\Providers;

use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Reset for every request and every queued job, so tenant state never leaks between them.
        $this->app->scoped(TenantContext::class);
    }

    public function boot(): void
    {
        // Catch lazy loading, silently discarded attributes and missing attributes during development.
        Model::shouldBeStrict(! $this->app->isProduction());

        Password::defaults(static function () {
            $rule = Password::min(10)->letters()->mixedCase()->numbers();

            return app()->isProduction() ? $rule->uncompromised() : $rule;
        });

        // Platform Super Admins pass every authorization check. The role is assigned in the
        // platform scope (team 0), never inside a company, so company admins cannot grant it.
        Gate::before(static function (User $user): ?bool {
            return $user->isSuperAdmin() ? true : null;
        });

        // Careers-page applications: 20 per hour per IP (in addition to 5 per minute).
        RateLimiter::for('public-apply', static fn (Request $request) => Limit::perHour(20)->by('apply:'.$request->ip()));

        RateLimiter::for('api', static function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->getAuthIdentifier() ?: $request->ip());
        });
    }
}
