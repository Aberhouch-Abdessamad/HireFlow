<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\JobPosting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class PublicCompanyController extends Controller
{
    /** GET /public/companies/{slug}: public company profile for the careers site. */
    public function show(string $slug): JsonResponse
    {
        $company = Company::query()->where('slug', $slug)->where('is_active', true)->firstOrFail();

        $openJobs = JobPosting::query()->publiclyVisible()->where('job_postings.company_id', $company->id)->count();

        return response()->json(['data' => [
            'name' => $company->name,
            'slug' => $company->slug,
            'website' => $company->website,
            'industry' => $company->industry,
            'size' => $company->size,
            'country' => $company->country,
            'description' => $company->description,
            'logo_url' => $company->logo_path ? Storage::disk('public')->url($company->logo_path) : null,
            'open_jobs_count' => $openJobs,
        ]]);
    }
}
