<?php

namespace App\Services\Jobs;

use App\Enums\JobStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\JobPosting;
use App\Models\Skill;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Business logic for job postings. Input is validated by Form Requests, including the checks
 * that department and recruiter ids belong to the active company.
 */
final class JobPostingService
{
    private const ATTRIBUTES = [
        'title', 'description', 'requirements', 'location', 'work_mode', 'employment_type',
        'experience_level', 'salary_min', 'salary_max', 'salary_currency', 'salary_visible', 'expires_at',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): JobPosting
    {
        return DB::transaction(function () use ($data, $actor): JobPosting {
            $job = new JobPosting(Arr::only($data, self::ATTRIBUTES));
            $job->forceFill([
                'slug' => $this->uniqueSlug($data['title']),
                'department_id' => $data['department_id'] ?? null,
                'created_by' => $actor->id,
                'status' => JobStatus::Draft,
            ])->save();

            $this->syncRelations($job, $data);
            $this->audit->record('job.created', $job, null, ['title' => $job->title]);

            return $job;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(JobPosting $job, array $data): JobPosting
    {
        if (! $job->status->isEditable()) {
            throw new BusinessRuleException('Archived jobs cannot be edited.', 'JOB_NOT_EDITABLE', 409);
        }

        return DB::transaction(function () use ($job, $data): JobPosting {
            $job->fill(Arr::only($data, self::ATTRIBUTES));
            if (array_key_exists('department_id', $data)) {
                $job->department_id = $data['department_id'];
            }

            $changes = $job->getDirty();
            $old = array_intersect_key($job->getOriginal(), $changes);
            $job->save();

            $this->syncRelations($job, $data);

            if ($changes !== []) {
                $this->audit->record('job.updated', $job, $this->serialise($old), $this->serialise($changes));
            }

            return $job;
        });
    }

    public function transition(JobPosting $job, JobStatus $target): JobPosting
    {
        return DB::transaction(function () use ($job, $target): JobPosting {
            /** @var JobPosting $locked */
            $locked = JobPosting::query()->lockForUpdate()->findOrFail($job->id);
            $from = $locked->status;

            if (! $from->canTransitionTo($target)) {
                throw new BusinessRuleException(
                    "A {$from->value} job cannot be moved to {$target->value}.",
                    'INVALID_JOB_TRANSITION',
                    409,
                );
            }

            if ($target === JobStatus::Published && $locked->expires_at !== null && $locked->expires_at->isPast()) {
                throw new BusinessRuleException(
                    'The expiration date has passed. Update it before publishing.',
                    'JOB_EXPIRED',
                    422,
                );
            }

            $locked->status = $target;
            match ($target) {
                JobStatus::Published => $locked->forceFill(['published_at' => $locked->published_at ?? now(), 'closed_at' => null]),
                JobStatus::Closed => $locked->forceFill(['closed_at' => now()]),
                default => null,
            };
            $locked->save();

            $this->audit->record('job.status_changed', $locked, ['status' => $from->value], ['status' => $target->value]);

            return $locked;
        });
    }

    public function delete(JobPosting $job): void
    {
        if (! $job->status->isDeletable()) {
            throw new BusinessRuleException(
                'Only draft or archived jobs can be deleted. Close and archive the job first.',
                'JOB_NOT_DELETABLE',
                409,
            );
        }

        if ($job->applications()->withTrashed()->exists()) {
            throw new BusinessRuleException(
                'Jobs with applications cannot be deleted. Archive the job instead.',
                'JOB_HAS_APPLICATIONS',
                409,
            );
        }

        $job->delete();
        $this->audit->record('job.deleted', $job, ['title' => $job->title], null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncRelations(JobPosting $job, array $data): void
    {
        if (array_key_exists('recruiter_ids', $data)) {
            $job->recruiters()->sync(array_values(array_unique(array_map('intval', $data['recruiter_ids'] ?? []))));
        }

        if (array_key_exists('skills', $data)) {
            $sync = [];
            foreach ($data['skills'] ?? [] as $skill) {
                $name = trim((string) $skill['name']);
                $slug = Str::slug($name);
                if ($slug === '') {
                    continue;
                }
                $model = Skill::query()->firstOrCreate(['slug' => $slug], ['name' => $name]);
                $sync[$model->id] = ['is_required' => (bool) ($skill['is_required'] ?? true)];
            }
            $job->skills()->sync($sync);
        }
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::limit(Str::slug($title) ?: 'job', 140, '');

        do {
            $slug = $base.'-'.Str::lower(Str::random(6));
        } while (JobPosting::withoutGlobalScopes()->withTrashed()->where('slug', $slug)->exists());

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function serialise(array $values): array
    {
        return array_map(
            static fn ($value) => $value instanceof \BackedEnum ? $value->value : ($value instanceof \DateTimeInterface ? $value->format(DATE_ATOM) : $value),
            Arr::except($values, ['description', 'requirements', 'updated_at']),
        ) + (array_key_exists('description', $values) ? ['description' => '[changed]'] : [])
          + (array_key_exists('requirements', $values) ? ['requirements' => '[changed]'] : []);
    }
}
