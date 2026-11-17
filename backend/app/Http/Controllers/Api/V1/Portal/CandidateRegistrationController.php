<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Portal\CandidatePortalService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CandidateRegistrationController extends Controller
{
    /**
     * POST /candidate/register: candidate-portal account. The account is linked to the
     * candidate's applications immediately.
     */
    public function __invoke(Request $request, CandidatePortalService $portal): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', Rule::unique(User::class, 'email')],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ]);

        $user = $portal->register($validated);
        event(new Registered($user));

        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['message' => 'Account created.'], 201);
    }
}
