<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Company\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class PublicInvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    /** GET /invitations/{token}: minimal preview so the invitee knows what they are accepting. */
    public function show(string $token): JsonResponse
    {
        $invitation = $this->invitations->findPending($token);

        abort_if($invitation === null || ! $invitation->company->is_active, 404);

        return response()->json(['data' => [
            'company' => ['name' => $invitation->company->name],
            'email' => $invitation->email,
            'role' => $invitation->role->value,
            'role_label' => $invitation->role->label(),
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'account_exists' => User::query()->where('email', $invitation->email)->exists(),
        ]]);
    }

    /** POST /invitations/{token}/accept */
    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = $this->invitations->findPending($token);
        abort_if($invitation === null, 404);

        $current = $request->user('web');
        $needsAccount = ! User::query()->where('email', $invitation->email)->exists();

        $data = $needsAccount
            ? $request->validate([
                'name' => ['required', 'string', 'max:120'],
                'password' => ['required', 'string', Password::defaults(), 'confirmed'],
            ])
            : [];

        $user = $this->invitations->accept($token, $current, $data);

        if ($current === null) {
            Auth::guard('web')->login($user);
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
        }

        return response()->json(['message' => 'Invitation accepted.']);
    }
}
