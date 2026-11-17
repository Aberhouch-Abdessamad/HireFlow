<?php

namespace App\Http\Controllers\Api\V1\Interviews;

use App\Enums\InterviewStatus;
use App\Enums\PermissionName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Interviews\FeedbackRequest;
use App\Http\Requests\V1\Interviews\InterviewRequest;
use App\Http\Resources\V1\FeedbackResource;
use App\Http\Resources\V1\InterviewResource;
use App\Models\Application;
use App\Models\CandidateDocument;
use App\Models\Interview;
use App\Models\InterviewFeedback;
use App\Models\User;
use App\Policies\InterviewPolicy;
use App\Services\Audit\AuditLogger;
use App\Services\Interviews\InterviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InterviewController extends Controller
{
    private const DETAIL = ['application.candidate.documents', 'application.jobPosting', 'application.stage', 'participants', 'feedback', 'scheduler'];

    public function __construct(
        private readonly InterviewService $interviews,
        private readonly InterviewPolicy $policy,
    ) {}

    /** GET /interviews?from=&to=&status=&mine=1&application_id= */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Interview::class);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', Rule::enum(InterviewStatus::class)],
            'mine' => ['nullable', 'boolean'],
            'application_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        /** @var User $user */
        $user = $request->user();
        // Interviewers only ever see their own interviews.
        $onlyMine = ! $this->policy->isScheduler($user) || $request->boolean('mine');

        $interviews = Interview::query()
            ->with(['application.candidate', 'application.jobPosting', 'application.stage', 'participants', 'feedback'])
            ->when($onlyMine, fn ($q) => $q->whereHas('participants', fn ($p) => $p->whereKey($user->id)))
            ->when($validated['from'] ?? null, fn ($q, string $from) => $q->where('scheduled_at', '>=', $from))
            ->when($validated['to'] ?? null, fn ($q, string $to) => $q->where('scheduled_at', '<=', $to))
            ->when($validated['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($validated['application_id'] ?? null, fn ($q, int $id) => $q->where('application_id', $id))
            ->orderBy('scheduled_at')
            ->paginate($validated['per_page'] ?? 50)
            ->withQueryString();

        return InterviewResource::collection($interviews);
    }

    /** POST /interviews */
    public function store(InterviewRequest $request): InterviewResource
    {
        Gate::authorize('create', Interview::class);

        /** @var User $actor */
        $actor = $request->user();
        $this->assertCanInterview($request->input('participant_ids', []));

        $interview = $this->interviews->schedule(
            Application::query()->findOrFail($request->integer('application_id')),
            $request->validated(),
            $actor,
        );

        return new InterviewResource($interview->load(self::DETAIL));
    }

    /** GET /interviews/{interview} */
    public function show(Interview $interview): InterviewResource
    {
        Gate::authorize('view', $interview);

        return new InterviewResource($interview->load(self::DETAIL));
    }

    /** PUT /interviews/{interview}: edit or reschedule. */
    public function update(InterviewRequest $request, Interview $interview): InterviewResource
    {
        Gate::authorize('update', $interview);

        if ($request->has('participant_ids')) {
            $this->assertCanInterview($request->input('participant_ids', []));
        }

        return new InterviewResource($this->interviews->update($interview, $request->validated())->load(self::DETAIL));
    }

    /** POST /interviews/{interview}/cancel {reason?} */
    public function cancel(Request $request, Interview $interview): InterviewResource
    {
        Gate::authorize('update', $interview);
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        return new InterviewResource($this->interviews->cancel($interview, $validated['reason'] ?? null)->load(self::DETAIL));
    }

    /** POST /interviews/{interview}/complete */
    public function complete(Interview $interview): InterviewResource
    {
        Gate::authorize('update', $interview);

        return new InterviewResource($this->interviews->complete($interview)->load(self::DETAIL));
    }

    /**
     * GET /interviews/{interview}/feedback
     *
     * Returns everyone's feedback to schedulers, and to participants once they've submitted their own.
     * Otherwise only the caller's own feedback (none yet) is returned.
     */
    public function feedback(Request $request, Interview $interview): JsonResponse
    {
        Gate::authorize('view', $interview);

        /** @var User $user */
        $user = $request->user();
        $canSeeAll = Gate::allows('viewAllFeedback', $interview);

        $feedback = InterviewFeedback::query()
            ->with('author')
            ->where('interview_id', $interview->id)
            ->when(! $canSeeAll, fn ($q) => $q->where('user_id', $user->id))
            ->orderBy('created_at')
            ->get();

        $mine = $feedback->firstWhere('user_id', $user->id);

        return response()->json([
            'data' => FeedbackResource::collection($feedback)->resolve(),
            'meta' => [
                'can_see_all' => $canSeeAll,
                'can_submit' => Gate::allows('submitFeedback', $interview),
                'my_feedback_id' => $mine?->id,
            ],
        ]);
    }

    /** POST /interviews/{interview}/feedback */
    public function submitFeedback(FeedbackRequest $request, Interview $interview): FeedbackResource
    {
        Gate::authorize('submitFeedback', $interview);

        /** @var User $user */
        $user = $request->user();

        return new FeedbackResource($this->interviews->submitFeedback($interview, $user, $request->validated())->load('author'));
    }

    /** GET /interviews/{interview}/documents/{document}/download: the candidate's CV for interviewers. */
    public function downloadDocument(Interview $interview, CandidateDocument $document, AuditLogger $audit): StreamedResponse
    {
        Gate::authorize('view', $interview);
        abort_unless((int) $document->candidate_id === (int) $interview->application->candidate_id, 404);

        $disk = Storage::disk(CandidateDocument::DISK);
        abort_unless($disk->exists($document->path), 404);
        $audit->record('candidate.document_downloaded', $document, null, ['via_interview' => $interview->id]);

        return $disk->download($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Interviewers must be able to see interviews and submit feedback.
     *
     * @param  array<int, mixed>  $ids
     */
    private function assertCanInterview(array $ids): void
    {
        $users = User::query()->with(['roles', 'permissions'])->whereIn('id', array_map('intval', $ids))->get();

        foreach ($users as $user) {
            if (! $user->checkPermissionTo(PermissionName::InterviewsSubmitFeedback->value)) {
                abort(422, "{$user->name} cannot take part in interviews.");
            }
        }
    }
}
