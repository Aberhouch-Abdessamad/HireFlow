<?php

namespace App\Services\Company;

use App\Enums\MembershipStatus;
use App\Enums\SystemRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\Invitation;
use App\Models\Scopes\CompanyScope;
use App\Models\User;
use App\Notifications\CompanyInvitationNotification;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

final class InvitationService
{
    public const TTL_DAYS = 7;

    public function __construct(
        private readonly TenantContext $tenant,
        private readonly AuditLogger $audit,
    ) {}

    /** Creates (or replaces) a pending invitation for the active company and emails it. */
    public function invite(string $email, SystemRole $role, User $inviter): Invitation
    {
        if (! in_array($role, SystemRole::companyRoles(), true)) {
            throw new BusinessRuleException('This role cannot be assigned to company members.', 'INVALID_ROLE');
        }

        $email = Str::lower(trim($email));
        $company = $this->tenant->company();

        $alreadyMember = $company->memberships()
            ->whereHas('user', static fn ($q) => $q->where('email', $email))
            ->exists();

        if ($alreadyMember) {
            throw new BusinessRuleException('This person is already a member of your company.', 'ALREADY_MEMBER', 409);
        }

        $token = Str::random(64);

        $invitation = DB::transaction(function () use ($email, $role, $inviter, $token): Invitation {
            // Only one pending invitation per email and company: revoke older ones.
            Invitation::query()->pending()->where('email', $email)->update(['revoked_at' => now()]);

            $invitation = new Invitation([
                'email' => $email,
                'role' => $role,
                'expires_at' => now()->addDays(self::TTL_DAYS),
            ]);
            $invitation->forceFill([
                'token_hash' => Invitation::hashToken($token),
                'invited_by' => $inviter->id,
            ])->save();

            $this->audit->record('invitation.created', $invitation, null, ['email' => $email, 'role' => $role->value]);

            return $invitation;
        });

        Notification::route('mail', $email)->notify(
            new CompanyInvitationNotification($company->name, $inviter->name, $role, $token),
        );

        return $invitation;
    }

    public function revoke(Invitation $invitation): void
    {
        if (! $invitation->isPending()) {
            throw new BusinessRuleException('Only pending invitations can be revoked.', 'INVITATION_NOT_PENDING', 409);
        }

        $invitation->forceFill(['revoked_at' => now()])->save();
        $this->audit->record('invitation.revoked', $invitation, null, ['email' => $invitation->email]);
    }

    /** Finds a pending invitation by plain token, across companies (public endpoint). */
    public function findPending(string $token): ?Invitation
    {
        $invitation = Invitation::withoutGlobalScope(CompanyScope::class)
            ->with('company')
            ->where('token_hash', Invitation::hashToken($token))
            ->first();

        return $invitation?->isPending() ? $invitation : null;
    }

    /**
     * Accepts an invitation.
     *
     * - Existing account: the caller must be signed in as the invited email.
     * - New account: created from name + password. The email counts as verified because the
     *   token was delivered to it.
     *
     * @param  array{name?: string, password?: string}  $data
     */
    public function accept(string $token, ?User $current, array $data): User
    {
        $invitation = $this->findPending($token)
            ?? throw new BusinessRuleException('This invitation is invalid or has expired.', 'INVITATION_INVALID', 404);

        /** @var Company $company */
        $company = $invitation->company;

        if (! $company->is_active) {
            throw new BusinessRuleException('This invitation is invalid or has expired.', 'INVITATION_INVALID', 404);
        }

        $existing = User::query()->where('email', $invitation->email)->first();

        if ($existing !== null && ($current === null || $current->id !== $existing->id)) {
            throw new BusinessRuleException(
                'Sign in with the invited email address to accept this invitation.',
                'LOGIN_REQUIRED',
                409,
            );
        }

        if ($existing === null && $current !== null) {
            throw new BusinessRuleException(
                'This invitation was sent to a different email address.',
                'INVITATION_EMAIL_MISMATCH',
                409,
            );
        }

        return DB::transaction(function () use ($invitation, $company, $existing, $data): User {
            $locked = Invitation::withoutGlobalScope(CompanyScope::class)->lockForUpdate()->findOrFail($invitation->id);

            if (! $locked->isPending()) {
                throw new BusinessRuleException('This invitation is invalid or has expired.', 'INVITATION_INVALID', 404);
            }

            $user = $existing ?? $this->createInvitedUser($invitation->email, $data);

            if (! $user->is_active) {
                throw new BusinessRuleException('This account is deactivated.', 'ACCOUNT_DEACTIVATED', 403);
            }

            $membership = $company->memberships()->where('user_id', $user->id)->first();

            if ($membership === null) {
                $company->users()->attach($user->id, [
                    'status' => MembershipStatus::Active->value,
                    'joined_at' => now(),
                    'invited_by' => $invitation->invited_by,
                ]);
            } else {
                // Previously deactivated members are reactivated by a new invitation.
                $membership->forceFill(['status' => MembershipStatus::Active])->save();
            }

            $this->tenant->runAs($company, function () use ($user, $locked, $company): void {
                $user->syncRoles([$locked->role->value]);
                $locked->forceFill(['accepted_at' => now()])->save();

                $this->audit->record('invitation.accepted', $locked, null, [
                    'email' => $user->email,
                    'role' => $locked->role->value,
                ], $company->id, $user->id);
            });

            $user->forceFill(['current_company_id' => $company->id])->save();

            return $user;
        });
    }

    /** @param array{name?: string, password?: string} $data */
    private function createInvitedUser(string $email, array $data): User
    {
        $user = User::create([
            'name' => $data['name'] ?? '',
            'email' => $email,
            'password' => Hash::make($data['password'] ?? Str::random(40)),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }
}
