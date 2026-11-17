<?php

namespace App\Services\Company;

use App\Enums\MembershipStatus;
use App\Enums\SystemRole;
use App\Events\CompanyRegistered;
use App\Models\Company;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Registers a new company together with its first Company Admin, in a single transaction.
 */
final class CompanyRegistrationService
{
    public function __construct(
        private readonly TenantContext $tenant,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array{company_name: string, name: string, email: string, password: string}  $data
     */
    public function register(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $company = Company::create([
                'name' => $data['company_name'],
                'slug' => $this->uniqueSlug($data['company_name']),
            ]);

            $user = User::create([
                'name' => $data['name'],
                'email' => Str::lower($data['email']),
                'password' => Hash::make($data['password']),
            ]);

            $company->users()->attach($user->id, [
                'status' => MembershipStatus::Active->value,
                'joined_at' => now(),
            ]);

            $user->forceFill(['current_company_id' => $company->id])->save();

            $this->tenant->runAs($company, function () use ($user, $company): void {
                $user->assignRole(SystemRole::CompanyAdmin->value);

                $this->audit->record('company.registered', $company, null, [
                    'company' => $company->name,
                    'admin_email' => $user->email,
                ], $company->id, $user->id);

                event(new CompanyRegistered($company, $user));
            });

            return $user;
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'company';
        $slug = $base;

        while (Company::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.Str::lower(Str::random(5));
        }

        return $slug;
    }
}
