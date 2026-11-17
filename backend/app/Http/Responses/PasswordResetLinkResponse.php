<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;

/**
 * Same response whether or not the email belongs to an account, so the forgot-password
 * endpoint can't be used to find out which emails are registered.
 */
class PasswordResetLinkResponse implements FailedPasswordResetLinkRequestResponse, SuccessfulPasswordResetLinkRequestResponse
{
    public function __construct(protected string $status = '') {}

    public function toResponse($request): JsonResponse
    {
        return new JsonResponse([
            'message' => 'If an account exists for that email address, a password reset link has been sent.',
        ]);
    }
}
