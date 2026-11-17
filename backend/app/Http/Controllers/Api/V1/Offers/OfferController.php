<?php

namespace App\Http\Controllers\Api\V1\Offers;

use App\Enums\OfferStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Offers\OfferRequest;
use App\Http\Resources\V1\OfferResource;
use App\Models\Application;
use App\Models\Offer;
use App\Models\User;
use App\Services\Offers\OfferService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class OfferController extends Controller
{
    private const DETAIL = ['application.candidate', 'application.jobPosting', 'creator', 'approver'];

    public function __construct(private readonly OfferService $offers) {}

    /** GET /offers?status=&application_id=&search= */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Offer::class);

        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(OfferStatus::class)],
            'application_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $offers = Offer::query()
            ->with(self::DETAIL)
            ->when($validated['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($validated['application_id'] ?? null, fn ($q, int $id) => $q->where('application_id', $id))
            ->when($validated['search'] ?? null, fn ($q, string $search) => $q->whereHas('application.candidate', function ($c) use ($search): void {
                $c->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return OfferResource::collection($offers);
    }

    /** POST /offers */
    public function store(OfferRequest $request): OfferResource
    {
        Gate::authorize('create', Offer::class);

        /** @var User $actor */
        $actor = $request->user();
        $offer = $this->offers->create(Application::query()->findOrFail($request->integer('application_id')), $request->validated(), $actor);

        // Keep the freshly created instance (wasRecentlyCreated) so the resource answers 201.
        return new OfferResource($offer->load(self::DETAIL));
    }

    /** GET /offers/{offer} */
    public function show(Offer $offer): OfferResource
    {
        Gate::authorize('view', $offer);

        return $this->respond($offer);
    }

    /** PUT /offers/{offer} (drafts only) */
    public function update(OfferRequest $request, Offer $offer): OfferResource
    {
        Gate::authorize('manage', $offer);

        return $this->respond($this->offers->update($offer, $request->validated()));
    }

    /** POST /offers/{offer}/submit */
    public function submit(Offer $offer): OfferResource
    {
        Gate::authorize('manage', $offer);

        return $this->respond($this->offers->submitForApproval($offer));
    }

    /** POST /offers/{offer}/approve {comment?} */
    public function approve(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('approve', $offer);
        $validated = $request->validate(['comment' => ['nullable', 'string', 'max:1000']]);

        /** @var User $actor */
        $actor = $request->user();

        return $this->respond($this->offers->approve($offer, $actor, $validated['comment'] ?? null));
    }

    /** POST /offers/{offer}/return {comment} : send back to draft with requested changes. */
    public function returnToDraft(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('approve', $offer);
        $validated = $request->validate(['comment' => ['required', 'string', 'max:1000']]);

        return $this->respond($this->offers->returnToDraft($offer, $validated['comment']));
    }

    /** POST /offers/{offer}/send */
    public function send(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('send', $offer);

        /** @var User $actor */
        $actor = $request->user();

        return $this->respond($this->offers->send($offer, $actor));
    }

    /** POST /offers/{offer}/accept {note?} : record the candidate's acceptance (e.g. by phone). */
    public function accept(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('send', $offer);
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        /** @var User $actor */
        $actor = $request->user();

        return $this->respond($this->offers->accept($offer, $actor, $validated['note'] ?? null, 'recorded_by_recruiter'));
    }

    /** POST /offers/{offer}/reject {note?} : record that the candidate declined. */
    public function reject(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('send', $offer);
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        return $this->respond($this->offers->decline($offer, $validated['note'] ?? null, 'recorded_by_recruiter'));
    }

    /** POST /offers/{offer}/withdraw {reason?} */
    public function withdraw(Request $request, Offer $offer): OfferResource
    {
        Gate::authorize('manage', $offer);
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        return $this->respond($this->offers->withdraw($offer, $validated['reason'] ?? null));
    }

    private function respond(Offer $offer): OfferResource
    {
        return new OfferResource($offer->fresh(self::DETAIL));
    }
}
