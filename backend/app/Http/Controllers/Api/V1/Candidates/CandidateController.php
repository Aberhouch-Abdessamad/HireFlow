<?php

namespace App\Http\Controllers\Api\V1\Candidates;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Candidates\CandidateRequest;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\CandidateResource;
use App\Models\Candidate;
use App\Models\User;
use App\Services\Candidates\CandidateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CandidateController extends Controller
{
    private const DETAIL = ['skills', 'tags', 'experiences', 'educations', 'documents.uploader', 'creator'];

    private const SORTABLE = ['created_at', 'last_name'];

    public function __construct(private readonly CandidateService $candidates) {}

    /** GET /candidates?search=&tag=&skill=&job_id=&sort= */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Candidate::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'tag' => ['nullable', 'string', 'max:50'],
            'skill' => ['nullable', 'string', 'max:80'],
            'job_id' => ['nullable', 'integer'],
            'sort' => ['nullable', Rule::in([...self::SORTABLE, ...array_map(fn ($c) => '-'.$c, self::SORTABLE)])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? '-created_at';

        $candidates = Candidate::query()
            ->with(['tags', 'skills'])
            ->withCount('applications')
            ->when($validated['search'] ?? null, function ($q, string $search): void {
                $q->where(function ($inner) use ($search): void {
                    $inner->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('headline', 'like', "%{$search}%");
                });
            })
            ->when($validated['tag'] ?? null, fn ($q, string $tag) => $q->whereHas('tags', fn ($t) => $t->where('name', $tag)))
            ->when($validated['skill'] ?? null, fn ($q, string $skill) => $q->whereHas('skills', fn ($s) => $s->where('name', $skill)))
            ->when($validated['job_id'] ?? null, fn ($q, int $jobId) => $q->whereHas('applications', fn ($a) => $a->where('job_posting_id', $jobId)))
            ->orderBy(ltrim($sort, '-'), str_starts_with($sort, '-') ? 'desc' : 'asc')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return CandidateResource::collection($candidates);
    }

    /** POST /candidates */
    public function store(CandidateRequest $request): CandidateResource
    {
        Gate::authorize('create', Candidate::class);

        /** @var User $actor */
        $actor = $request->user();

        return new CandidateResource($this->candidates->create($request->validated(), $actor)->load(self::DETAIL)->loadCount('applications'));
    }

    /** GET /candidates/{candidate} */
    public function show(Candidate $candidate): CandidateResource
    {
        Gate::authorize('view', $candidate);

        return new CandidateResource($candidate->load(self::DETAIL)->loadCount('applications'));
    }

    /** PUT /candidates/{candidate} */
    public function update(CandidateRequest $request, Candidate $candidate): CandidateResource
    {
        Gate::authorize('update', $candidate);

        return new CandidateResource($this->candidates->update($candidate, $request->validated())->load(self::DETAIL)->loadCount('applications'));
    }

    /** DELETE /candidates/{candidate} (soft delete; application history is kept) */
    public function destroy(Candidate $candidate): Response
    {
        Gate::authorize('delete', $candidate);
        $this->candidates->delete($candidate);

        return response()->noContent();
    }

    /** GET /candidates/duplicates?email=&phone=&first_name=&last_name=&ignore_id= */
    public function duplicates(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Candidate::class);

        $validated = $request->validate([
            'email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'first_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'ignore_id' => ['nullable', 'integer'],
        ]);

        $matches = $this->candidates->findDuplicates(
            $validated['email'] ?? null,
            $validated['phone'] ?? null,
            $validated['first_name'] ?? null,
            $validated['last_name'] ?? null,
            $validated['ignore_id'] ?? null,
        );

        return response()->json(['data' => $matches->map(fn (Candidate $c) => [
            'id' => $c->id,
            'full_name' => $c->full_name,
            'email' => $c->email,
            'phone' => $c->phone,
            'headline' => $c->headline,
        ])->values()]);
    }

    /** GET /candidates/{candidate}/applications */
    public function applications(Candidate $candidate): AnonymousResourceCollection
    {
        Gate::authorize('view', $candidate);

        return ApplicationResource::collection(
            $candidate->applications()->with(['jobPosting', 'stage', 'assignee'])->latest('applied_at')->get(),
        );
    }
}
