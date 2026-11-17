<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkMode;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PublicJobDetailResource;
use App\Http\Resources\V1\PublicJobResource;
use App\Models\JobPosting;
use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Public careers API (no authentication). Only published, unexpired jobs of active companies.
 */
class PublicJobController extends Controller
{
    /** GET /public/jobs?search=&company=&employment_type=&experience_level=&work_mode=&location= */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'company' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:100'],
            'employment_type' => ['nullable', Rule::enum(EmploymentType::class)],
            'experience_level' => ['nullable', Rule::enum(ExperienceLevel::class)],
            'work_mode' => ['nullable', Rule::enum(WorkMode::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $jobs = JobPosting::query()
            ->publiclyVisible()
            ->with($this->publicRelations(false))
            ->when($validated['search'] ?? null, fn (Builder $q, string $search) => $q->where('title', 'like', '%'.$search.'%'))
            ->when($validated['company'] ?? null, fn (Builder $q, string $slug) => $q->whereHas('company', fn (Builder $c) => $c->where('slug', $slug)))
            ->when($validated['location'] ?? null, fn (Builder $q, string $location) => $q->where('location', 'like', '%'.$location.'%'))
            ->when($validated['employment_type'] ?? null, fn (Builder $q, string $type) => $q->where('employment_type', $type))
            ->when($validated['experience_level'] ?? null, fn (Builder $q, string $level) => $q->where('experience_level', $level))
            ->when($validated['work_mode'] ?? null, fn (Builder $q, string $mode) => $q->where('work_mode', $mode))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return PublicJobResource::collection($jobs);
    }

    /** GET /public/jobs/{slug} */
    public function show(string $slug): PublicJobDetailResource
    {
        $job = JobPosting::query()
            ->publiclyVisible()
            ->with($this->publicRelations(true))
            ->where('slug', $slug)
            ->firstOrFail();

        return new PublicJobDetailResource($job);
    }

    /**
     * Related tenant-owned models are loaded without the tenant scope. That is safe here because
     * each relation is already constrained to the job's own company.
     *
     * @return array<string, \Closure>
     */
    private function publicRelations(bool $withSkills): array
    {
        $unscoped = static fn ($query) => $query->withoutGlobalScope(CompanyScope::class);

        return array_filter([
            'company' => static fn ($query) => $query,
            'department' => $unscoped,
            'skills' => $withSkills ? $unscoped : null,
        ]);
    }
}
