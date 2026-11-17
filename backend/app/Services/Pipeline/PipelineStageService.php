<?php

namespace App\Services\Pipeline;

use App\Enums\StageType;
use App\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\RecruitmentStage;
use App\Models\Scopes\CompanyScope;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Manages each company's configurable pipeline.
 *
 * Rules: the first stage is always the single `applied` stage and the last is always the
 * single `hired` stage. Custom stages can be added, renamed, reordered and deleted (when empty)
 * between them.
 */
final class PipelineStageService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function createDefaults(Company $company): void
    {
        $exists = RecruitmentStage::withoutGlobalScope(CompanyScope::class)->where('company_id', $company->id)->exists();
        if ($exists) {
            return;
        }

        // Create the stages inside the new company's own context: this can be triggered
        // from anywhere (model observer, seeder, queued job) while another tenant is active.
        app(TenantContext::class)->runAs($company, function () use ($company): void {
            foreach (StageType::defaultPipeline() as $index => $stage) {
                $model = new RecruitmentStage(['name' => $stage['name'], 'type' => $stage['type'], 'position' => $index + 1]);
                $model->forceFill(['company_id' => $company->id])->save();
            }
        });
    }

    public function create(string $name, StageType $type, int $position): RecruitmentStage
    {
        if ($type->isSystem()) {
            throw new BusinessRuleException('Each pipeline has exactly one Applied and one Hired stage.', 'SYSTEM_STAGE_TYPE');
        }

        return DB::transaction(function () use ($name, $type, $position): RecruitmentStage {
            $stages = $this->lockedStages();
            $position = $this->clampPosition($position, $stages->count() + 1);

            $stage = RecruitmentStage::create(['name' => $name, 'type' => $type, 'position' => 0]);
            $ordered = $stages->values()->all();
            array_splice($ordered, $position - 1, 0, [$stage]);
            $this->renumber($ordered);

            $this->audit->record('pipeline.stage_created', $stage, null, ['name' => $name, 'type' => $type->value]);

            return $stage->refresh();
        });
    }

    public function update(RecruitmentStage $stage, string $name, ?int $position): RecruitmentStage
    {
        return DB::transaction(function () use ($stage, $name, $position): RecruitmentStage {
            $stages = $this->lockedStages();
            $old = ['name' => $stage->name, 'position' => $stage->position];
            $stage->name = $name;
            $stage->save();

            if ($position !== null && ! $stage->type->isSystem()) {
                $ordered = $stages->reject(fn (RecruitmentStage $s) => $s->id === $stage->id)->values()->all();
                $position = $this->clampPosition($position, count($ordered) + 1);
                array_splice($ordered, $position - 1, 0, [$stage]);
                $this->renumber($ordered);
            }

            $stage->refresh();
            $this->audit->record('pipeline.stage_updated', $stage, $old, ['name' => $stage->name, 'position' => $stage->position]);

            return $stage;
        });
    }

    public function delete(RecruitmentStage $stage): void
    {
        if ($stage->type->isSystem()) {
            throw new BusinessRuleException('The Applied and Hired stages cannot be deleted.', 'SYSTEM_STAGE');
        }

        DB::transaction(function () use ($stage): void {
            $stages = $this->lockedStages();

            if ($stage->applications()->withTrashed()->exists()
                || DB::table('application_stage_history')->where('to_stage_id', $stage->id)->orWhere('from_stage_id', $stage->id)->exists()) {
                throw new BusinessRuleException(
                    'This stage is used by applications and cannot be deleted. Rename it instead.',
                    'STAGE_IN_USE',
                    409,
                );
            }

            $stage->delete();
            $this->renumber($stages->reject(fn (RecruitmentStage $s) => $s->id === $stage->id)->values()->all());
            $this->audit->record('pipeline.stage_deleted', $stage, ['name' => $stage->name], null);
        });
    }

    /** @return Collection<int, RecruitmentStage> */
    private function lockedStages(): Collection
    {
        return RecruitmentStage::query()->orderBy('position')->lockForUpdate()->get();
    }

    /** Keeps Applied first and Hired last; custom positions are clamped between them. */
    private function clampPosition(int $position, int $count): int
    {
        return max(2, min($position, $count - 1));
    }

    /** @param list<RecruitmentStage> $ordered */
    private function renumber(array $ordered): void
    {
        $applied = array_values(array_filter($ordered, fn ($s) => $s->type === StageType::Applied));
        $hired = array_values(array_filter($ordered, fn ($s) => $s->type === StageType::Hired));
        $middle = array_values(array_filter($ordered, fn ($s) => ! $s->type->isSystem()));
        $final = [...$applied, ...$middle, ...$hired];

        foreach ($final as $index => $stage) {
            if ($stage->position !== $index + 1) {
                $stage->forceFill(['position' => $index + 1])->saveQuietly();
            }
        }
    }
}
