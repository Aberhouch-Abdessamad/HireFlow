<?php

namespace App\Services\Company;

use App\Enums\MembershipStatus;
use App\Enums\SystemRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Makes sure every company keeps at least one active Company Admin. */
final class CompanyAdminGuard
{
    public function activeAdminCount(int $companyId): int
    {
        $tables = config('permission.table_names');
        $teamKey = config('permission.column_names.team_foreign_key');
        $morphKey = config('permission.column_names.model_morph_key');

        return DB::table($tables['model_has_roles'].' as mhr')
            ->join($tables['roles'].' as r', 'r.id', '=', 'mhr.role_id')
            ->join('company_user as cu', function ($join) use ($morphKey, $teamKey): void {
                $join->on('cu.user_id', '=', 'mhr.'.$morphKey)->on('cu.company_id', '=', 'mhr.'.$teamKey);
            })
            ->join('users as u', 'u.id', '=', 'cu.user_id')
            ->where('mhr.'.$teamKey, $companyId)
            ->where('mhr.model_type', (new User)->getMorphClass())
            ->where('r.name', SystemRole::CompanyAdmin->value)
            ->where('cu.status', MembershipStatus::Active->value)
            ->where('u.is_active', true)
            ->distinct()
            ->count('cu.user_id');
    }

    public function isAdmin(Membership $membership): bool
    {
        return $membership->user->hasRole(SystemRole::CompanyAdmin->value);
    }

    /** Throws if removing admin rights from this membership would leave the company without an admin. */
    public function ensureNotLastAdmin(Membership $membership): void
    {
        if ($this->isAdmin($membership) && $membership->isActive() && $this->activeAdminCount($membership->company_id) <= 1) {
            throw new BusinessRuleException(
                'A company must keep at least one active Company Admin.',
                'LAST_COMPANY_ADMIN',
                409,
            );
        }
    }
}
