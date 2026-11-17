<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CompanyResource;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Company logos are public (shown on the careers site), so they live on the `public` disk.
 * SVG is not accepted: it can contain scripts.
 */
class CompanyLogoController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenant,
        private readonly AuditLogger $audit,
    ) {}

    /** POST /company/logo (multipart, field "logo") */
    public function store(Request $request): CompanyResource
    {
        $company = $this->tenant->company();
        Gate::authorize('update', $company);

        $request->validate([
            'logo' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:min_width=32,min_height=32,max_width=4000,max_height=4000'],
        ]);

        $file = $request->file('logo');
        $path = $file->storeAs(
            'companies/'.$company->id,
            'logo-'.Str::lower(Str::random(16)).'.'.$file->extension(),
            'public',
        );

        $old = $company->logo_path;
        $company->forceFill(['logo_path' => $path])->save();

        if ($old !== null) {
            Storage::disk('public')->delete($old);
        }

        $this->audit->record('company.logo_updated', $company);

        return new CompanyResource($company);
    }

    /** DELETE /company/logo */
    public function destroy(): CompanyResource
    {
        $company = $this->tenant->company();
        Gate::authorize('update', $company);

        if ($company->logo_path !== null) {
            Storage::disk('public')->delete($company->logo_path);
            $company->forceFill(['logo_path' => null])->save();
            $this->audit->record('company.logo_removed', $company);
        }

        return new CompanyResource($company);
    }
}
