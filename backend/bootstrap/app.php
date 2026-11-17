<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\EnsureCandidate;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\LogApiTraffic;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA authentication: requests from SANCTUM_STATEFUL_DOMAINS get session + CSRF.
        $middleware->statefulApi();
        $middleware->throttleApi();

        $middleware->prependToGroup('api', ForceJsonResponse::class);
        // Global (outermost) so it also records Fortify's /api/v1/auth routes, throttled and
        // unauthenticated calls. It only acts on /api/* paths.
        $middleware->prepend(LogApiTraffic::class);
        $middleware->append(SecurityHeaders::class);

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'candidate' => EnsureCandidate::class,
            'tenant' => ResolveTenant::class,
        ]);

        // Run account checks and tenant resolution *before* route model binding, so bound models
        // are already filtered to the active company (CompanyScope) when they are resolved.
        $middleware->prependToPriorityList(SubstituteBindings::class, EnsureUserIsActive::class);

        $middleware->prependToPriorityList(SubstituteBindings::class, ResolveTenant::class);

        // This is an API: never redirect unauthenticated users to a login page.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(
            fn (Throwable $e, Request $request) => ApiExceptionRenderer::render($e, $request),
        );
    })->create();
