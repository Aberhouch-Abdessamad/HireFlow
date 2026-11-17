<?php

namespace App\Http\Controllers\Api\V1\Applications;

use App\Enums\ApplicationSource;
use App\Enums\ApplicationStatus;
use App\Enums\MembershipStatus;
use App\Enums\PermissionName;
use App\Enums\RejectionReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Applications\RejectApplicationRequest;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\StageHistoryResource;
use App\Http\Resources\V1\StageResource;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\JobPosting;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ApplicationController extends Controller
{
    private const DETAIL = ['candidate', 'jobPosting', 'stage', 'assignee'];

    public function __construct(
        private readonly ApplicationService $applications,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /applications?job_id=&stage_id=&status=&assigned_to=&search=&sort= */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Application::class);

        $validated = $request->validate([
            'job_id' => ['nullable', 'integer'],
            'stage_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(ApplicationStatus::class)],
            'assigned_to' => ['nullable', 'string', 'max:20'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(['applied_at', '-applied_at', 'stage_entered_at', '-stage_entered_at'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? '-applied_at';

        $applications = Application::query()
            ->with(self::DETAIL)
            ->when($validated['job_id'] ?? null, fn ($q, int $id) => $q->where('job_posting_id', $id))
            ->when($validated['stage_id'] ?? null, fn ($q, int $id) => $q->where('current_stage_id', $id))
            ->when($validated['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($validated['assigned_to'] ?? null, function ($q, string $assigned) use ($request): void {
                match ($assigned) {
                    'me' => $q->where('assigned_to', $request->user()->id),
                    'none' => $q->whereNull('assigned_to'),
                    default => $q->where('assigned_to', (int) $assigned),
                };
            })
            ->when($validated['search'] ?? null, fn ($q, string $search) => $q->whereHas('candidate', function ($c) use ($search): void {
                $c->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy(ltrim($sort, '-'), str_starts_with($sort, '-') ? 'desc' : 'asc')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return ApplicationResource::collection($applications);
    }

    /** GET /applications/pipeline?job_id= : active applications grouped by stage (board view). */
    public function pipeline(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Application::class);
        $validated = $request->validate(['job_id' => ['nullable', 'integer']]);

        $stages = RecruitmentStage::query()->orderBy('position')->get();
        $applications = Application::query()
            ->with(['candidate', 'jobPosting', 'assignee', 'stage'])
            ->whereIn('status', [ApplicationStatus::Active->value, ApplicationStatus::Hired->value])
            ->when($validated['job_id'] ?? null, fn ($q, int $id) => $q->where('job_posting_id', $id))
            ->orderBy('stage_entered_at')
            ->limit(1000)
            ->get()
            ->groupBy('current_stage_id');

        return response()->json(['data' => $stages->map(fn (RecruitmentStage $stage) => [
            'stage' => (new StageResource($stage))->resolve(),
            'applications' => ApplicationResource::collection($applications->get($stage->id, collect()))->resolve(),
        ])->values()]);
    }

    /** POST /applications {candidate_id, job_id, source?, cover_letter?} */
    public function store(Request $request): ApplicationResource
    {
        Gate::authorize('create', Application::class);
        $companyId = $this->tenant->id();

        $validated = $request->validate([
            'candidate_id' => ['required', 'integer', Rule::exists('candidates', 'id')->where('company_id', $companyId)->whereNull('deleted_at')],
            'job_id' => ['required', 'integer', Rule::exists('job_postings', 'id')->where('company_id', $companyId)->whereNull('deleted_at')],
            'source' => ['sometimes', Rule::enum(ApplicationSource::class)],
            'cover_letter' => ['nullable', 'string', 'max:5000'],
        ]);

        /** @var User $actor */
        $actor = $request->user();
        $application = $this->applications->create(
            Candidate::query()->findOrFail($validated['candidate_id']),
            JobPosting::query()->findOrFail($validated['job_id']),
            ApplicationSource::from($validated['source'] ?? ApplicationSource::Manual->value),
            $validated['cover_letter'] ?? null,
            $actor,
        );

        return new ApplicationResource($application->load(self::DETAIL));
    }

    /** GET /applications/{application} */
    public function show(Application $application): ApplicationResource
    {
        Gate::authorize('view', $application);

        return new ApplicationResource($application->load(self::DETAIL));
    }

    /** POST /applications/{application}/stage {stage_id, notes?} */
    public function moveStage(Request $request, Application $application): ApplicationResource
    {
        Gate::authorize('moveStage', $application);

        $validated = $request->validate([
            'stage_id' => ['required', 'integer', Rule::exists('recruitment_stages', 'id')->where('company_id', $this->tenant->id())],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        /** @var User $actor */
        $actor = $request->user();
        $updated = $this->applications->moveToStage(
            $application,
            RecruitmentStage::query()->findOrFail($validated['stage_id']),
            $validated['notes'] ?? null,
            $actor,
        );

        return new ApplicationResource($updated->load(self::DETAIL));
    }

    /** POST /applications/{application}/assign {user_id|null} */
    public function assign(Request $request, Application $application): ApplicationResource
    {
        Gate::authorize('assign', $application);

        $validated = $request->validate([
            'user_id' => [
                'present',
                'nullable',
                'integer',
                Rule::exists('company_user', 'user_id')
                    ->where('company_id', $this->tenant->id())
                    ->where('status', MembershipStatus::Active->value),
            ],
        ]);

        $assignee = null;
        if ($validated['user_id'] !== null) {
            $assignee = User::query()->findOrFail($validated['user_id']);
            if (! $assignee->checkPermissionTo(PermissionName::ApplicationsView->value)) {
                abort(422, 'This member cannot view applications.');
            }
        }

        return new ApplicationResource($this->applications->assign($application, $assignee)->load(self::DETAIL));
    }

    /** POST /applications/{application}/reject {reason, note?} */
    public function reject(RejectApplicationRequest $request, Application $application): ApplicationResource
    {
        Gate::authorize('reject', $application);

        /** @var User $actor */
        $actor = $request->user();
        $updated = $this->applications->reject(
            $application,
            RejectionReason::from($request->string('reason')->value()),
            $request->input('note'),
            $actor,
        );

        return new ApplicationResource($updated->load(self::DETAIL));
    }

    /** POST /applications/{application}/reopen */
    public function reopen(Request $request, Application $application): ApplicationResource
    {
        Gate::authorize('reject', $application);

        /** @var User $actor */
        $actor = $request->user();

        return new ApplicationResource($this->applications->reopen($application, $actor)->load(self::DETAIL));
    }

    /** GET /applications/{application}/history */
    public function history(Application $application): AnonymousResourceCollection
    {
        Gate::authorize('view', $application);

        return StageHistoryResource::collection($application->history()->with(['fromStage', 'toStage', 'performer'])->get());
    }
}
