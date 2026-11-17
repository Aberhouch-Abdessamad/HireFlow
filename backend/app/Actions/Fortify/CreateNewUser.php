<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\Company\CompanyRegistrationService;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Company registration (POST /api/v1/auth/register): creates the company and its first admin.
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(private readonly CompanyRegistrationService $registration) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        // Fortify's register route has no throttle of its own: limit sign-ups per IP.
        $key = 'register:'.request()->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw new ThrottleRequestsException('Too many registration attempts.');
        }
        RateLimiter::hit($key, 3600);

        /** @var array{company_name: string, name: string, email: string, password: string} $data */
        $data = Validator::make($input, [
            'company_name' => ['required', 'string', 'min:2', 'max:120'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', Rule::unique(User::class)],
            'password' => $this->passwordRules(),
        ])->validate();

        return $this->registration->register($data);
    }
}
