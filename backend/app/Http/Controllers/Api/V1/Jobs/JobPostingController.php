<?php

namespace App\Http\Controllers\Api\V1\Jobs;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Jobs\JobPostingRequest;
use App\Http\Resources\V1\JobPostingResource;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\Jobs\JobPostingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class JobPostingController extends Controller
{
    private const SORTABLE = ['created_at', 'title', 'published_at', 'expires_at'];

    private const DETAIL_RELATIONS = ['department', 'recruiters', 'skills', 'creator'];

    public function __construct(private readonly JobPostingService $jobs) {}

    /** GET /jobs?search=&status=&department_id=&employment_type=&experience_level=&work_mode=&sort=-created_at */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', JobPosting::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(JobStatus::class)],
            'department_id' => ['nullable', 'integer'],
            'employment_type' => ['nullable', Rule::enum(EmploymentType::class)],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'work_mode' => ['nullable', Rule::enum(WorkMode::class)],
            'sort' => ['nullable', 'string', Rule::in([...self::SORTABLE, ...array_map(fn ($c) => '-'.$c, self::SORTABLE)])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';

        $jobs = JobPosting::query()
            ->with(['department', 'recruiters'])
            ->withCount(['applications', 'applications as active_applications_count' => fn ($q) => $q->where('status', 'active')])
            ->when($validated['search'] ?? null, fn ($q, string $search) => $q->where(function ($inner) use ($search): void {
                $inner->where('title', 'like', '%'.$search.'%')->orWhere('location', 'like', '%'.$search.'%');
            }))
            ->when($validated['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($validated['department_id'] ?? null, fn ($q, int $id) => $q->where('department_id', $id))
            ->when($validated['employment_type'] ?? null, fn ($q, string $type) => $q->where('employment_type', $type))
            ->when($validated['experience_level'] ?? null, fn ($q, string $level) => $q->where('experience_level', $level))
            ->when($validated['work_mode'] ?? null, fn ($q, string $mode) => $q->where('work_mode', $mode))
            ->orderBy(ltrim($sort, '-'), $direction)
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return JobPostingResource::collection($jobs);
    }

    /** POST /jobs */
    public function store(JobPostingRequest $request): JobPostingResource
    {
        Gate::authorize('create', JobPosting::class);

        /** @var User $actor */
        $actor = $request->user();
        $job = $this->jobs->create($request->validated(), $actor);

        return new JobPostingResource($job->load(self::DETAIL_RELATIONS));
    }

    /** GET /jobs/{job} */
    public function show(JobPosting $job): JobPostingResource
    {
        Gate::authorize('view', $job);

        return new JobPostingResource($job->load(self::DETAIL_RELATIONS)->loadCount([
            'applications',
            'applications as active_applications_count' => fn ($q) => $q->where('status', 'active'),
        ]));
    }

    /** PUT /jobs/{job} */
    public function update(JobPostingRequest $request, JobPosting $job): JobPostingResource
    {
        Gate::authorize('update', $job);

        return new JobPostingResource($this->jobs->update($job, $request->validated())->load(self::DETAIL_RELATIONS));
    }

    /** DELETE /jobs/{job} */
    public function destroy(JobPosting $job): Response
    {
        Gate::authorize('delete', $job);
        $this->jobs->delete($job);

        return response()->noContent();
    }

    /** POST /jobs/{job}/publish */
    public function publish(JobPosting $job): JobPostingResource
    {
        return $this->transition($job, JobStatus::Published);
    }

    /** POST /jobs/{job}/pause */
    public function pause(JobPosting $job): JobPostingResource
    {
        return $this->transition($job, JobStatus::Paused);
    }

    /** POST /jobs/{job}/close */
    public function close(JobPosting $job): JobPostingResource
    {
        return $this->transition($job, JobStatus::Closed);
    }

    /** POST /jobs/{job}/archive */
    public function archive(JobPosting $job): JobPostingResource
    {
        return $this->transition($job, JobStatus::Archived);
    }

    private function transition(JobPosting $job, JobStatus $target): JobPostingResource
    {
        Gate::authorize('changeStatus', $job);

        return new JobPostingResource($this->jobs->transition($job, $target)->load(self::DETAIL_RELATIONS));
    }
}
