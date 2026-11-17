<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Company\UpdateCompanyRequest;
use App\Http\Resources\V1\CompanyResource;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\Gate;

class CompanyController extends Controller
{
    public function __construct(private readonly TenantContext $tenant) {}

    /** GET /company */
    public function show(): CompanyResource
    {
        $company = $this->tenant->company();
        Gate::authorize('view', $company);

        return new CompanyResource($company);
    }

    /** PUT /company */
    public function update(UpdateCompanyRequest $request, AuditLogger $audit): CompanyResource
    {
        $company = $this->tenant->company();
        Gate::authorize('update', $company);

        $company->fill($request->validated());
        $changes = $company->getDirty();
        $old = array_intersect_key($company->getOriginal(), $changes);
        $company->save();

        if ($changes !== []) {
            $audit->record('company.updated', $company, $old, $changes);
        }

        return new CompanyResource($company);
    }
}
