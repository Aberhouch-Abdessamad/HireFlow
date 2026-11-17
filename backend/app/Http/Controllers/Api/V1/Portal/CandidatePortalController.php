<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Candidates\UploadDocumentRequest;
use App\Http\Resources\V1\CandidateOfferResource;
use App\Http\Resources\V1\PortalApplicationResource;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use App\Models\Company;
use App\Models\Offer;
use App\Models\Scopes\CompanyScope;
use App\Models\User;
use App\Services\Candidates\CandidateService;
use App\Services\Offers\OfferService;
use App\Services\Portal\CandidatePortalService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Candidate portal. Every query is limited to candidate records linked to the signed-in user.
 */
class CandidatePortalController extends Controller
{
    public function __construct(
        private readonly CandidatePortalService $portal,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /candidate/applications */
    public function applications(Request $request): AnonymousResourceCollection
    {
        return PortalApplicationResource::collection(
            $this->portal->applications($this->user($request))
                ->with(['interviews' => fn ($q) => $q->withoutGlobalScope(CompanyScope::class)])
                ->latest('applied_at')
                ->get(),
        );
    }

    /** GET /candidate/applications/{id} */
    public function application(Request $request, int $id): PortalApplicationResource
    {
        $application = $this->portal->findApplication($this->user($request), $id);

        return new PortalApplicationResource($application->load(['interviews' => fn ($q) => $q->withoutGlobalScope(CompanyScope::class)]));
    }

    /** GET /candidate/offers */
    public function offers(Request $request): AnonymousResourceCollection
    {
        return CandidateOfferResource::collection($this->loadOffer($this->portal->offers($this->user($request)))->latest('sent_at')->get());
    }

    /** POST /candidate/offers/{id}/accept {note?} */
    public function acceptOffer(Request $request, int $id, OfferService $offers): CandidateOfferResource
    {
        return $this->respondToOffer($request, $id, fn (Offer $offer, ?string $note) => $offers->accept($offer, null, $note, 'candidate_portal'));
    }

    /** POST /candidate/offers/{id}/decline {note?} */
    public function declineOffer(Request $request, int $id, OfferService $offers): CandidateOfferResource
    {
        return $this->respondToOffer($request, $id, fn (Offer $offer, ?string $note) => $offers->decline($offer, $note, 'candidate_portal'));
    }

    /** GET /candidate/profile */
    public function profile(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $latest = $user->candidateProfiles()->latest('updated_at')->first();

        return response()->json(['data' => [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $latest?->phone,
            'location' => $latest?->location,
            'linkedin_url' => $latest?->linkedin_url,
            'portfolio_url' => $latest?->portfolio_url,
            'linked_companies' => $user->candidateProfiles()->with('company:id,name')->get()->pluck('company.name')->unique()->values(),
        ]]);
    }

    /** PUT /candidate/profile : updates the account and every linked candidate record. */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+().\-\s]{6,40}$/'],
            'location' => ['nullable', 'string', 'max:150'],
            'linkedin_url' => ['nullable', 'url:https', 'max:255'],
            'portfolio_url' => ['nullable', 'url:https,http', 'max:255'],
        ]);

        $user->update(['name' => $validated['name']]);
        $user->candidateProfiles()->get()->each(function (Candidate $candidate) use ($validated): void {
            $candidate->forceFill([
                'phone' => $validated['phone'] ?? null,
                'phone_normalized' => Candidate::normalizePhone($validated['phone'] ?? null),
                'location' => $validated['location'] ?? null,
                'linkedin_url' => $validated['linkedin_url'] ?? null,
                'portfolio_url' => $validated['portfolio_url'] ?? null,
            ])->saveQuietly();
        });

        return $this->profile($request);
    }

    /** GET /candidate/documents : documents across the user's candidate records. */
    public function documents(Request $request): JsonResponse
    {
        $documents = CandidateDocument::withoutGlobalScope(CompanyScope::class)
            ->whereIn('candidate_id', $this->user($request)->candidateProfiles()->pluck('id'))
            ->with(['candidate' => fn ($q) => $q->withoutGlobalScope(CompanyScope::class), 'candidate.company:id,name'])
            ->latest()
            ->get();

        return response()->json(['data' => $documents->map(fn (CandidateDocument $d) => [
            'id' => $d->id,
            'original_name' => $d->original_name,
            'mime_type' => $d->mime_type,
            'size' => $d->size,
            'company' => $d->candidate->company->name,
            'created_at' => $d->created_at?->toIso8601String(),
            'download_url' => '/api/v1/candidate/documents/'.$d->id.'/download',
        ])->values()]);
    }

    /** POST /candidate/documents {application_id, file}: share an updated CV with one company. */
    public function uploadDocument(UploadDocumentRequest $request, CandidateService $candidates): JsonResponse
    {
        $request->validate(['application_id' => ['required', 'integer']]);
        $user = $this->user($request);
        $application = $this->portal->findApplication($user, $request->integer('application_id'));

        $this->tenant->runAs(Company::query()->findOrFail($application->company_id), function () use ($application, $request, $candidates, $user): void {
            $candidate = Candidate::query()->findOrFail($application->candidate_id);
            $candidates->storeDocument($candidate, $request->file('file'), 'cv', $user);
        });

        return response()->json(['message' => 'Document uploaded.'], 201);
    }

    /** GET /candidate/documents/{id}/download */
    public function downloadDocument(Request $request, int $id): StreamedResponse
    {
        $document = CandidateDocument::withoutGlobalScope(CompanyScope::class)
            ->whereIn('candidate_id', $this->user($request)->candidateProfiles()->pluck('id'))
            ->findOrFail($id);

        return Storage::disk(CandidateDocument::DISK)->download($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @param  callable(Offer, ?string): Offer  $action
     */
    private function respondToOffer(Request $request, int $id, callable $action): CandidateOfferResource
    {
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);
        $offer = $this->portal->offers($this->user($request))->findOrFail($id);

        $updated = $this->tenant->runAs(
            Company::query()->findOrFail($offer->company_id),
            fn () => $action($offer, $validated['note'] ?? null),
        );

        return new CandidateOfferResource($this->loadOffer(Offer::withoutGlobalScope(CompanyScope::class)->whereKey($updated->id))->firstOrFail());
    }

    /**
     * @param  Builder<Offer>  $query
     * @return Builder<Offer>
     */
    private function loadOffer($query)
    {
        $unscoped = fn ($q) => $q->withoutGlobalScope(CompanyScope::class);

        return $query->with([
            'application' => $unscoped,
            'application.company',
            'application.candidate' => $unscoped,
            'application.jobPosting' => $unscoped,
        ]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
