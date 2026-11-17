<?php

namespace App\Support\Tenancy;

use App\Exceptions\TenantNotResolvedException;
use App\Models\Company;

/**
 * Holds the company (tenant) that the current request or job runs for.
 *
 * Registered as a *scoped* binding, so it is reset between requests and queued jobs.
 * Only server-side code sets it (the ResolveTenant middleware, or jobs restoring their
 * own company); it is never filled from client input.
 */
final class TenantContext
{
    /**
     * Spatie "team" id used for platform-level role assignments (Super Admin).
     * No company has id 0, so these assignments never apply inside a company.
     */
    public const PLATFORM_TEAM_ID = 0;

    private ?Company $company = null;

    public function set(Company $company): void
    {
        $this->company = $company;
    }

    public function has(): bool
    {
        return $this->company !== null;
    }

    public function company(): Company
    {
        return $this->company ?? throw new TenantNotResolvedException;
    }

    public function id(): int
    {
        return $this->company()->getKey();
    }

    public function forget(): void
    {
        $this->company = null;
    }

    /**
     * Runs a callback inside another tenant's context and restores the previous one afterwards.
     * Intended for queued jobs, seeders and console commands.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public function runAs(Company $company, callable $callback): mixed
    {
        $previous = $this->company;
        $previousTeam = getPermissionsTeamId();
        $this->company = $company;
        setPermissionsTeamId($company->getKey());

        try {
            return $callback();
        } finally {
            $this->company = $previous;
            setPermissionsTeamId($previousTeam);
        }
    }
}
