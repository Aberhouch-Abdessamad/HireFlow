<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\ApplicationSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Applications\PublicApplyRequest;
use App\Models\Candidate;
use App\Models\Company;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use App\Services\Candidates\CandidateService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;

class PublicApplicationController extends Controller
{
    private const SUCCESS = 'Thank you! Your application has been received.';

    public function __construct(
        private readonly TenantContext $tenant,
        private readonly CandidateService $candidates,
        private readonly ApplicationService $applications,
    ) {}

    /**
     * POST /public/jobs/{slug}/apply (multipart)
     *
     * The tenant comes from the job itself, never from the request. An existing candidate is
     * matched by email inside that company only.
     */
    public function store(PublicApplyRequest $request, string $slug): JsonResponse
    {
        $publicJob = JobPosting::query()->publiclyVisible()->where('slug', $slug)->firstOrFail();

        // Honeypot filled: answer like a success so bots learn nothing, but store nothing.
        if (filled($request->input('website'))) {
            return response()->json(['message' => self::SUCCESS], 201);
        }

        $company = Company::query()->findOrFail($publicJob->company_id);
        $data = $request->validated();

        $this->tenant->runAs($company, function () use ($publicJob, $data, $request): void {
            $job = JobPosting::query()->findOrFail($publicJob->id);
            $candidate = Candidate::query()->where('email', mb_strtolower(trim($data['email'])))->first();

            if ($candidate !== null && $candidate->applications()->withTrashed()->where('job_posting_id', $job->id)->exists()) {
                $this->applications->create($candidate, $job, ApplicationSource::CareersPage, null, null, true); // throws ALREADY_APPLIED
            }

            $candidate ??= $this->candidates->create(
                [...Arr::only($data, ['first_name', 'last_name', 'email', 'phone', 'location', 'linkedin_url', 'portfolio_url']), 'source' => ApplicationSource::CareersPage->value],
                null,
            );

            $this->applications->create($candidate, $job, ApplicationSource::CareersPage, $data['cover_letter'] ?? null, null, true);

            if ($candidate->user_id === null) {
                $account = User::query()->where('email', $candidate->email)->whereNotNull('email_verified_at')->first();
                if ($account !== null && $account->isCandidate()) {
                    $candidate->forceFill(['user_id' => $account->id])->saveQuietly();
                }
            }
            $this->candidates->storeDocument($candidate, $request->file('cv'), 'cv', null);
        });

        return response()->json(['message' => self::SUCCESS], 201);
    }
}
