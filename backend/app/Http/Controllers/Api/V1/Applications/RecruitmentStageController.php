<?php

namespace App\Http\Controllers\Api\V1\Applications;

use App\Enums\StageType;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\StageResource;
use App\Models\RecruitmentStage;
use App\Services\Pipeline\PipelineStageService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class RecruitmentStageController extends Controller
{
    public function __construct(
        private readonly PipelineStageService $stages,
        private readonly TenantContext $tenant,
    ) {}

    /** GET /recruitment-stages */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', RecruitmentStage::class);

        return StageResource::collection(
            RecruitmentStage::query()->withCount('applications')->orderBy('position')->get(),
        );
    }

    /** POST /recruitment-stages {name, type, position} */
    public function store(Request $request): StageResource
    {
        Gate::authorize('manage', RecruitmentStage::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:60', Rule::unique('recruitment_stages', 'name')->where('company_id', $this->tenant->id())],
            'type' => ['required', Rule::enum(StageType::class)->except([StageType::Applied, StageType::Hired])],
            'position' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        return new StageResource($this->stages->create($validated['name'], StageType::from($validated['type']), $validated['position']));
    }

    /** PUT /recruitment-stages/{stage} {name, position?} */
    public function update(Request $request, RecruitmentStage $stage): StageResource
    {
        Gate::authorize('manage', $stage);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:60', Rule::unique('recruitment_stages', 'name')->where('company_id', $this->tenant->id())->ignore($stage->id)],
            'position' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return new StageResource($this->stages->update($stage, $validated['name'], $validated['position'] ?? null));
    }

    /** DELETE /recruitment-stages/{stage} */
    public function destroy(RecruitmentStage $stage): Response
    {
        Gate::authorize('manage', $stage);
        $this->stages->delete($stage);

        return response()->noContent();
    }
}
