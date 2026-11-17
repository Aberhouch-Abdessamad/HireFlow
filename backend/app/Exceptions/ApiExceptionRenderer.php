<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Renders every API error in one shape:
 *
 *   { "message": string, "code": string, "errors"?: { field: string[] } }
 *
 * Messages for unexpected errors are generic, so stack traces, SQL and file paths never reach
 * clients outside debug mode.
 */
final class ApiExceptionRenderer
{
    private const HTTP_CODES = [
        400 => ['BAD_REQUEST', 'Bad request.'],
        401 => ['UNAUTHENTICATED', 'Unauthenticated.'],
        403 => ['FORBIDDEN', 'This action is unauthorized.'],
        404 => ['NOT_FOUND', 'Resource not found.'],
        405 => ['METHOD_NOT_ALLOWED', 'Method not allowed.'],
        409 => ['CONFLICT', 'The request conflicts with the current state of the resource.'],
        419 => ['CSRF_TOKEN_MISMATCH', 'CSRF token mismatch. Refresh and try again.'],
        422 => ['VALIDATION_FAILED', 'The given data was invalid.'],
        429 => ['TOO_MANY_REQUESTS', 'Too many requests. Please slow down.'],
        503 => ['SERVICE_UNAVAILABLE', 'Service temporarily unavailable.'],
    ];

    public static function render(Throwable $e, Request $request): ?JsonResponse
    {
        if (! ($request->is('api/*') || $request->expectsJson())) {
            return null;
        }

        return match (true) {
            $e instanceof ApiException => self::apiException($e),
            $e instanceof ValidationException => self::json(
                422,
                'VALIDATION_FAILED',
                $e->getMessage(),
                ['errors' => $e->errors()],
            ),
            $e instanceof AuthenticationException => self::json(401, 'UNAUTHENTICATED', 'Unauthenticated.'),
            $e instanceof HttpExceptionInterface => self::httpException($e),
            default => self::unexpected(),
        };
    }

    private static function apiException(ApiException $e): JsonResponse
    {
        // Server-side ApiExceptions (5xx) describe programming errors: keep their details internal.
        if ($e->status() >= 500 && ! config('app.debug')) {
            return self::json($e->status(), 'SERVER_ERROR', 'Server error.');
        }

        return self::json($e->status(), $e->errorCode(), $e->getMessage());
    }

    private static function httpException(HttpExceptionInterface $e): JsonResponse
    {
        $status = $e->getStatusCode();
        [$code, $defaultMessage] = self::HTTP_CODES[$status] ?? ['HTTP_ERROR', 'Request failed.'];

        // 404 and 403 messages can contain model class names or policy details: always use the generic text.
        $message = in_array($status, [403, 404], true) || $e->getMessage() === ''
            ? $defaultMessage
            : $e->getMessage();

        if ($status >= 500) {
            $message = $defaultMessage;
        }

        return self::json($status, $code, $message)->withHeaders($e->getHeaders());
    }

    private static function unexpected(): ?JsonResponse
    {
        // In debug mode, let Laravel render the full exception for developers.
        if (config('app.debug')) {
            return null;
        }

        return self::json(500, 'SERVER_ERROR', 'Server error.');
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private static function json(int $status, string $code, string $message, array $extra = []): JsonResponse
    {
        return new JsonResponse(['message' => $message, 'code' => $code, ...$extra], $status);
    }
}
