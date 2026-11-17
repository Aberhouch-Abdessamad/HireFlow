<?php

namespace App\Services\Applications;

use App\Enums\ApplicationSource;
use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Enums\RejectionReason;
use App\Enums\StageType;
use App\Events\ApplicationStageChanged;
use App\Events\ApplicationSubmitted;
use App\Exceptions\BusinessRuleException;
use App\Models\Application;
use App\Models\ApplicationNote;
use App\Models\ApplicationStageHistory;
use App\Models\Candidate;
use App\Models\JobPosting;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * The recruitment pipeline. Every change runs in a transaction with a row lock, writes an
 * append-only history entry, and dispatches its event after commit.
 */
final class ApplicationService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(
        Candidate $candidate,
        JobPosting $job,
        ApplicationSource $source,
        ?string $coverLetter,
        ?User $actor,
        bool $requirePublished = false,
    ): Application {
        $allowed = $requirePublished ? [JobStatus::Published] : [JobStatus::Published, JobStatus::Paused, JobStatus::Draft];
        if (! in_array($job->status, $allowed, true)) {
            throw new BusinessRuleException('This job is not accepting applications.', 'JOB_NOT_OPEN', 409);
        }

        if (Application::query()->withTrashed()->where('job_posting_id', $job->id)->where('candidate_id', $candidate->id)->exists()) {
            throw new BusinessRuleException('This candidate has already applied to this job.', 'ALREADY_APPLIED', 409);
        }

        $firstStage = RecruitmentStage::query()->where('type', StageType::Applied->value)->firstOrFail();

        try {
            $application = DB::transaction(function () use ($candidate, $job, $source, $coverLetter, $actor, $firstStage): Application {
                $application = new Application(['source' => $source, 'cover_letter' => $coverLetter]);
                $application->forceFill([
                    'job_posting_id' => $job->id,
                    'candidate_id' => $candidate->id,
                    'current_stage_id' => $firstStage->id,
                    'status' => ApplicationStatus::Active,
                    'applied_at' => now(),
                    'stage_entered_at' => now(),
                ])->save();

                ApplicationStageHistory::create([
                    'application_id' => $application->id,
                    'from_stage_id' => null,
                    'to_stage_id' => $firstStage->id,
                    'from_status' => null,
                    'to_status' => ApplicationStatus::Active->value,
                    'performed_by' => $actor?->id,
                    'notes' => $source === ApplicationSource::CareersPage ? 'Applied via careers page' : null,
                ]);

                $this->audit->record('application.created', $application, null, [
                    'job_id' => $job->id,
                    'candidate_id' => $candidate->id,
                    'source' => $source->value,
                ]);

                return $application;
            });
        } catch (UniqueConstraintViolationException) {
            // Two simultaneous submissions: the database constraint is the final guard.
            throw new BusinessRuleException('This candidate has already applied to this job.', 'ALREADY_APPLIED', 409);
        }

        DB::afterCommit(fn () => event(new ApplicationSubmitted($application)));

        return $application;
    }

    public function moveToStage(Application $application, RecruitmentStage $target, ?string $notes, User $actor): Application
    {
        if ($target->type === StageType::Hired) {
            throw new BusinessRuleException(
                'Candidates are marked as hired when they accept an offer.',
                'HIRE_REQUIRES_OFFER',
                409,
            );
        }

        return $this->transition($application, function (Application $locked) use ($target): array {
            if (! $locked->status->isOpen()) {
                throw new BusinessRuleException('Only active applications can change stage.', 'APPLICATION_CLOSED', 409);
            }
            if ($locked->current_stage_id === $target->id) {
                throw new BusinessRuleException('The application is already in this stage.', 'SAME_STAGE', 409);
            }

            $locked->forceFill(['current_stage_id' => $target->id, 'stage_entered_at' => now()]);

            return ['application.stage_changed', $target->id, ApplicationStatus::Active];
        }, $notes, $actor);
    }

    public function reject(Application $application, RejectionReason $reason, ?string $note, User $actor): Application
    {
        return $this->transition($application, function (Application $locked) use ($reason, $note): array {
            if (! $locked->status->isOpen()) {
                throw new BusinessRuleException('Only active applications can be rejected.', 'APPLICATION_CLOSED', 409);
            }

            $locked->forceFill([
                'status' => ApplicationStatus::Rejected,
                'rejection_reason' => $reason,
                'rejection_note' => $note,
                'rejected_at' => now(),
            ]);

            return ['application.rejected', $locked->current_stage_id, ApplicationStatus::Rejected];
        }, $note ? $reason->label().': '.$note : $reason->label(), $actor);
    }

    public function reopen(Application $application, User $actor): Application
    {
        return $this->transition($application, function (Application $locked): array {
            if ($locked->status !== ApplicationStatus::Rejected) {
                throw new BusinessRuleException('Only rejected applications can be reopened.', 'APPLICATION_NOT_REJECTED', 409);
            }

            $locked->forceFill([
                'status' => ApplicationStatus::Active,
                'rejection_reason' => null,
                'rejection_note' => null,
                'rejected_at' => null,
            ]);

            return ['application.reopened', $locked->current_stage_id, ApplicationStatus::Active];
        }, null, $actor);
    }

    /**
     * Marks the application hired (moves it to the Hired stage). Called only by the offer
     * workflow when a candidate accepts an offer.
     */
    public function markHired(Application $application, ?User $actor, string $note = 'Offer accepted'): Application
    {
        $hiredStage = RecruitmentStage::query()->where('type', StageType::Hired->value)->firstOrFail();

        return $this->transition($application, function (Application $locked) use ($hiredStage): array {
            if (! $locked->status->isOpen()) {
                throw new BusinessRuleException('Only active applications can be hired.', 'APPLICATION_CLOSED', 409);
            }

            $locked->forceFill([
                'status' => ApplicationStatus::Hired,
                'current_stage_id' => $hiredStage->id,
                'stage_entered_at' => now(),
                'hired_at' => now(),
            ]);

            return ['application.hired', $hiredStage->id, ApplicationStatus::Hired];
        }, $note, $actor);
    }

    public function assign(Application $application, ?User $assignee): Application
    {
        $old = $application->assigned_to;
        $application->forceFill(['assigned_to' => $assignee?->id])->save();
        $this->audit->record('application.assigned', $application, ['assigned_to' => $old], ['assigned_to' => $assignee?->id]);

        return $application;
    }

    public function addNote(Application $application, string $body, User $author): ApplicationNote
    {
        $note = new ApplicationNote(['body' => $body]);
        $note->forceFill(['application_id' => $application->id, 'author_id' => $author->id])->save();

        return $note;
    }

    /**
     * @param  callable(Application): array{0: string, 1: int, 2: ApplicationStatus}  $mutate
     */
    private function transition(Application $application, callable $mutate, ?string $notes, ?User $actor): Application
    {
        [$locked, $history] = DB::transaction(function () use ($application, $mutate, $notes, $actor): array {
            /** @var Application $locked */
            $locked = Application::query()->lockForUpdate()->findOrFail($application->id);
            $fromStage = $locked->current_stage_id;
            $fromStatus = $locked->status;

            [$event, $toStage, $toStatus] = $mutate($locked);
            $locked->save();

            $history = ApplicationStageHistory::create([
                'application_id' => $locked->id,
                'from_stage_id' => $fromStage,
                'to_stage_id' => $toStage,
                'from_status' => $fromStatus->value,
                'to_status' => $toStatus->value,
                'performed_by' => $actor?->id,
                'notes' => $notes,
            ]);

            $this->audit->record($event, $locked, ['stage_id' => $fromStage, 'status' => $fromStatus->value], [
                'stage_id' => $toStage,
                'status' => $toStatus->value,
            ]);

            return [$locked, $history];
        });

        DB::afterCommit(fn () => event(new ApplicationStageChanged($locked, $history)));

        return $locked;
    }
}
