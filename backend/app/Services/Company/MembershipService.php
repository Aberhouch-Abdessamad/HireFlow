<?php

namespace App\Services\Company;

use App\Enums\MembershipStatus;
use App\Enums\SystemRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Membership;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

final class MembershipService
{
    public function __construct(
        private readonly CompanyAdminGuard $adminGuard,
        private readonly AuditLogger $audit,
    ) {}

    public function changeRole(Membership $membership, SystemRole $role, User $actor): Membership
    {
        $this->assertCompanyRole($role);
        $this->assertNotSelf($membership, $actor, 'You cannot change your own role.');

        return DB::transaction(function () use ($membership, $role): Membership {
            // Serialise concurrent role changes in the same company (last-admin check).
            Membership::query()->where('company_id', $membership->company_id)->lockForUpdate()->get(['id']);

            $user = $membership->user;
            $oldRoles = $user->getRoleNames()->all();

            if ($role !== SystemRole::CompanyAdmin) {
                $this->adminGuard->ensureNotLastAdmin($membership);
            }

            $user->syncRoles([$role->value]);
            $user->unsetRelation('roles');

            $this->audit->record('member.role_changed', $membership, ['roles' => $oldRoles], ['roles' => [$role->value]]);

            return $membership->refresh();
        });
    }

    public function deactivate(Membership $membership, User $actor): Membership
    {
        $this->assertNotSelf($membership, $actor, 'You cannot deactivate your own membership.');

        return DB::transaction(function () use ($membership): Membership {
            Membership::query()->where('company_id', $membership->company_id)->lockForUpdate()->get(['id']);

            $this->adminGuard->ensureNotLastAdmin($membership);

            $membership->forceFill(['status' => MembershipStatus::Deactivated])->save();
            $this->audit->record('member.deactivated', $membership, ['status' => 'active'], ['status' => 'deactivated']);

            return $membership;
        });
    }

    public function activate(Membership $membership): Membership
    {
        if ($membership->isActive()) {
            return $membership;
        }

        $membership->forceFill(['status' => MembershipStatus::Active])->save();
        $this->audit->record('member.activated', $membership, ['status' => 'deactivated'], ['status' => 'active']);

        return $membership;
    }

    public function switchCompany(User $user, int $companyId): void
    {
        $membership = $user->activeMembershipIn($companyId);

        if ($membership === null) {
            // Same response whether the company does not exist or the user is not a member.
            throw new BusinessRuleException('You are not an active member of this company.', 'NOT_A_MEMBER', 403);
        }

        $user->forceFill(['current_company_id' => $companyId])->save();
        $this->audit->record('auth.company_switched', $membership, null, ['company_id' => $companyId], $companyId);
    }

    private function assertCompanyRole(SystemRole $role): void
    {
        if (! in_array($role, SystemRole::companyRoles(), true)) {
            throw new BusinessRuleException('This role cannot be assigned to company members.', 'INVALID_ROLE');
        }
    }

    private function assertNotSelf(Membership $membership, User $actor, string $message): void
    {
        if ($membership->user_id === $actor->id) {
            throw new BusinessRuleException($message, 'SELF_MODIFICATION', 409);
        }
    }
}
