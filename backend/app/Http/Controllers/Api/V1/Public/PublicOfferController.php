<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CandidateOfferResource;
use App\Models\Company;
use App\Models\Offer;
use App\Models\Scopes\CompanyScope;
use App\Services\Offers\OfferService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;

/**
 * Offer response link from the candidate's email: /offers/respond/{token} in the SPA.
 * The token is single-purpose, 64 random characters, stored only as a hash.
 */
class PublicOfferController extends Controller
{
    public function __construct(
        private readonly OfferService $offers,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /public/offers/{token} */
    public function show(string $token): CandidateOfferResource
    {
        return new CandidateOfferResource($this->find($token));
    }

    /** POST /public/offers/{token}/accept {note?} */
    public function accept(Request $request, string $token): CandidateOfferResource
    {
        $offer = $this->find($token);
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->tenant->runAs(
            Company::query()->findOrFail($offer->company_id),
            fn () => $this->offers->accept($offer, null, $validated['note'] ?? null, 'candidate_link'),
        );

        return new CandidateOfferResource($this->load($updated));
    }

    /** POST /public/offers/{token}/decline {note?} */
    public function decline(Request $request, string $token): CandidateOfferResource
    {
        $offer = $this->find($token);
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->tenant->runAs(
            Company::query()->findOrFail($offer->company_id),
            fn () => $this->offers->decline($offer, $validated['note'] ?? null, 'candidate_link'),
        );

        return new CandidateOfferResource($this->load($updated));
    }

    private function find(string $token): Offer
    {
        $offer = Offer::withoutGlobalScope(CompanyScope::class)
            ->where('response_token_hash', Offer::hashToken($token))
            ->firstOrFail();

        return $this->load($offer);
    }

    private function load(Offer $offer): Offer
    {
        $unscoped = fn ($q) => $q->withoutGlobalScope(CompanyScope::class);

        return $offer->load([
            'application' => $unscoped,
            'application.company',
            'application.candidate' => $unscoped,
            'application.jobPosting' => $unscoped,
        ]);
    }
}
