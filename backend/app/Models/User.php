<?php

namespace App\Models;

use App\Enums\SystemRole;
use App\Support\Tenancy\TenantContext;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property bool $is_active
 * @property int|null $current_company_id
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    protected $attributes = [
        'is_active' => true,
        'current_company_id' => null,
        'two_factor_confirmed_at' => null,
        'last_login_at' => null,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /** @return BelongsToMany<Company, $this, Membership> */
    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_user')
            ->using(Membership::class)
            ->withPivot(['id', 'status', 'job_title', 'joined_at'])
            ->withTimestamps();
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /** @return BelongsTo<Company, $this> */
    public function currentCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'current_company_id');
    }

    /** Active membership in an active company, or null. */
    public function activeMembershipIn(int $companyId): ?Membership
    {
        return $this->memberships()->active()->with('company')->where('company_user.company_id', $companyId)->first();
    }

    public function firstActiveMembership(): ?Membership
    {
        return $this->memberships()->active()->with('company')->orderBy('company_user.id')->first();
    }

    /** Per-instance cache for platform-scoped role checks. */
    private array $platformRoleCache = [];

    /**
     * Platform Super Admin: the super_admin role assigned in the platform scope
     * (team id TenantContext::PLATFORM_TEAM_ID), independent of the active company.
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasPlatformRole(SystemRole::SuperAdmin);
    }

    /** Candidate-portal account (role assigned in the platform scope). */
    public function isCandidate(): bool
    {
        return $this->hasPlatformRole(SystemRole::Candidate);
    }

    public function hasPlatformRole(SystemRole $role): bool
    {
        if (array_key_exists($role->value, $this->platformRoleCache)) {
            return $this->platformRoleCache[$role->value];
        }

        $tables = config('permission.table_names');
        $teamKey = config('permission.column_names.team_foreign_key');

        return $this->platformRoleCache[$role->value] = DB::table($tables['model_has_roles'].' as mhr')
            ->join($tables['roles'].' as r', 'r.id', '=', 'mhr.role_id')
            ->where('mhr.model_type', $this->getMorphClass())
            ->where('mhr.'.config('permission.column_names.model_morph_key'), $this->getKey())
            ->where('mhr.'.$teamKey, TenantContext::PLATFORM_TEAM_ID)
            ->where('r.name', $role->value)
            ->exists();
    }

    /** Grants platform Super Admin. Only for seeders and trusted platform tooling. */
    public function grantSuperAdmin(): void
    {
        $this->grantPlatformRole(SystemRole::SuperAdmin);
    }

    /** Assigns a role in the platform scope (Super Admin or Candidate). */
    public function grantPlatformRole(SystemRole $role): void
    {
        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId(TenantContext::PLATFORM_TEAM_ID);

        try {
            $this->assignRole($role->value);
        } finally {
            setPermissionsTeamId($previousTeam);
            $this->unsetRelation('roles');
            $this->platformRoleCache = [];
        }
    }

    /** @return HasMany<Candidate, $this> Candidate records (one per company) linked to this portal account. */
    public function candidateProfiles(): HasMany
    {
        return $this->hasMany(Candidate::class)->withoutGlobalScope(Scopes\CompanyScope::class);
    }
}
