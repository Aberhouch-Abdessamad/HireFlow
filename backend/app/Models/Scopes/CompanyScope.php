<?php

namespace App\Models\Scopes;

use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Restricts tenant-owned models to the active company.
 *
 * Fails closed: with no active tenant, queries return no rows instead of every company's
 * rows. Platform-level code that needs cross-tenant access must opt out explicitly with
 * Model::withoutGlobalScope(CompanyScope::class).
 */
final class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $context = app(TenantContext::class);
        $column = $model->qualifyColumn('company_id');

        if ($context->has()) {
            $builder->where($column, $context->id());

            return;
        }

        $builder->whereRaw('1 = 0');
    }
}
