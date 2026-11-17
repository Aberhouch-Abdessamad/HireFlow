<?php

namespace App\Models\Concerns;

use App\Exceptions\CrossTenantWriteException;
use App\Exceptions\TenantNotResolvedException;
use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Makes a model tenant-owned through its `company_id` column.
 *
 * - Reads are scoped to the active company (CompanyScope, fails closed).
 * - On create, `company_id` is filled from the TenantContext. It is never mass-assigned from input.
 * - Creating or moving a record into a different company than the active one is rejected.
 *
 * @mixin Model
 */
trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope(new CompanyScope);

        static::creating(static function (Model $model): void {
            $context = app(TenantContext::class);
            $companyId = $model->getAttribute('company_id');

            if ($companyId === null) {
                if (! $context->has()) {
                    throw new TenantNotResolvedException;
                }

                $model->setAttribute('company_id', $context->id());

                return;
            }

            if ($context->has() && (int) $companyId !== $context->id()) {
                throw new CrossTenantWriteException;
            }
        });

        static::updating(static function (Model $model): void {
            if ($model->isDirty('company_id')) {
                throw new CrossTenantWriteException;
            }
        });
    }

    /** @return BelongsTo<Company, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Explicit cross-tenant query for platform-level code (Super Admin tools, scheduled jobs).
     *
     * @param  Builder<static>  $query
     */
    public function scopeForCompany(Builder $query, Company|int $company): void
    {
        $query->withoutGlobalScope(CompanyScope::class)
            ->where($this->qualifyColumn('company_id'), $company instanceof Company ? $company->getKey() : $company);
    }
}
