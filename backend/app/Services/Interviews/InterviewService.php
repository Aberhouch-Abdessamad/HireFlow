<?php

namespace App\Services\Interviews;

use App\Enums\InterviewStatus;
use App\Events\FeedbackSubmitted;
use App\Events\InterviewCancelled;
use App\Events\InterviewRescheduled;
use App\Events\InterviewScheduled;
use App\Exceptions\BusinessRuleException;
use App\Models\Application;
use App\Models\Interview;
use App\Models\InterviewFeedback;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class InterviewService
{
    private const ATTRIBUTES = ['type', 'scheduled_at', 'duration_minutes', 'timezone', 'meeting_url', 'location', 'agenda'];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data  Validated input incl. participant_ids and force
     */
    public function schedule(Application $application, array $data, User $actor): Interview
    {
        if (! $application->status->isOpen()) {
            throw new BusinessRuleException('Interviews can only be scheduled for active applications.', 'APPLICATION_CLOSED', 409);
        }

        $start = Carbon::parse($data['scheduled_at'])->utc();
        $participants = array_values(array_unique(array_map('intval', $data['participant_ids'])));

        if (! ($data['force'] ?? false)) {
            $this->assertNoConflicts($participants, $start, (int) $data['duration_minutes']);
        }

        $interview = DB::transaction(function () use ($application, $data, $actor, $start, $participants): Interview {
            $interview = new Interview([...Arr::only($data, self::ATTRIBUTES), 'scheduled_at' => $start]);
            $interview->forceFill(['application_id' => $application->id, 'scheduled_by' => $actor->id])->save();
            $interview->participants()->sync($participants);

            $this->audit->record('interview.scheduled', $interview, null, [
                'application_id' => $application->id,
                'scheduled_at' => $start->toIso8601String(),
                'participants' => $participants,
            ]);

            return $interview;
        });

        DB::afterCommit(fn () => event(new InterviewScheduled($interview)));

        return $interview;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Interview $interview, array $data): Interview
    {
        $this->assertScheduled($interview);

        $start = isset($data['scheduled_at']) ? Carbon::parse($data['scheduled_at'])->utc() : $interview->scheduled_at;
        $duration = (int) ($data['duration_minutes'] ?? $interview->duration_minutes);
        $participants = array_key_exists('participant_ids', $data)
            ? array_values(array_unique(array_map('intval', $data['participant_ids'])))
            : $interview->participants()->pluck('users.id')->all();

        if (! ($data['force'] ?? false)) {
            $this->assertNoConflicts($participants, $start, $duration, $interview->id);
        }

        $rescheduled = ! $start->equalTo($interview->scheduled_at) || $duration !== $interview->duration_minutes;

        DB::transaction(function () use ($interview, $data, $start, $participants, $rescheduled): void {
            $old = ['scheduled_at' => $interview->scheduled_at->toIso8601String(), 'duration_minutes' => $interview->duration_minutes];
            $interview->fill([...Arr::only($data, self::ATTRIBUTES), 'scheduled_at' => $start]);
            if ($interview->meeting_url === null && $interview->location === null) {
                throw new BusinessRuleException('Add a meeting link or a location.', 'MEETING_OR_LOCATION_REQUIRED');
            }
            if ($rescheduled) {
                $interview->reminder_sent_at = null;
            }
            $interview->save();
            $interview->participants()->sync($participants);

            $this->audit->record($rescheduled ? 'interview.rescheduled' : 'interview.updated', $interview, $old, [
                'scheduled_at' => $interview->scheduled_at->toIso8601String(),
                'duration_minutes' => $interview->duration_minutes,
                'participants' => $participants,
            ]);
        });

        if ($rescheduled) {
            DB::afterCommit(fn () => event(new InterviewRescheduled($interview)));
        }

        return $interview;
    }

    public function cancel(Interview $interview, ?string $reason): Interview
    {
        $this->assertScheduled($interview);

        $interview->forceFill([
            'status' => InterviewStatus::Cancelled,
            'cancellation_reason' => $reason,
            'cancelled_at' => now(),
        ])->save();

        $this->audit->record('interview.cancelled', $interview, null, ['reason' => $reason]);
        DB::afterCommit(fn () => event(new InterviewCancelled($interview)));

        return $interview;
    }

    public function complete(Interview $interview): Interview
    {
        $this->assertScheduled($interview);
        if ($interview->scheduled_at->isFuture()) {
            throw new BusinessRuleException('An interview can only be completed after it starts.', 'INTERVIEW_NOT_STARTED', 409);
        }

        $interview->forceFill(['status' => InterviewStatus::Completed, 'completed_at' => now()])->save();
        $this->audit->record('interview.completed', $interview);

        return $interview;
    }

    /**
     * Saves (or revises) the interviewer's feedback. When every participant has submitted,
     * the interview is marked completed.
     *
     * @param  array<string, mixed>  $data
     */
    public function submitFeedback(Interview $interview, User $interviewer, array $data): InterviewFeedback
    {
        if ($interview->status === InterviewStatus::Cancelled) {
            throw new BusinessRuleException('Feedback cannot be submitted for a cancelled interview.', 'INTERVIEW_CANCELLED', 409);
        }
        if ($interview->scheduled_at->isFuture()) {
            throw new BusinessRuleException('Feedback can be submitted once the interview has started.', 'FEEDBACK_TOO_EARLY', 409);
        }

        $feedback = DB::transaction(function () use ($interview, $interviewer, $data): InterviewFeedback {
            // Look the feedback row up directly: firstOrNew() would mass-assign the
            // identifying keys, which are deliberately not fillable.
            $feedback = InterviewFeedback::query()
                ->where('interview_id', $interview->id)
                ->where('user_id', $interviewer->id)
                ->first() ?? new InterviewFeedback;
            $feedback->fill(Arr::only($data, [
                'technical_score', 'communication_score', 'problem_solving_score', 'overall_rating', 'recommendation', 'comments',
            ]));
            $feedback->forceFill(['interview_id' => $interview->id, 'user_id' => $interviewer->id])->save();

            $participants = $interview->participants()->count();
            $submitted = InterviewFeedback::query()->where('interview_id', $interview->id)->count();
            if ($interview->status === InterviewStatus::Scheduled && $submitted >= $participants) {
                $interview->forceFill(['status' => InterviewStatus::Completed, 'completed_at' => now()])->save();
            }

            $this->audit->record('interview.feedback_submitted', $interview, null, [
                'recommendation' => $feedback->recommendation->value,
                'overall_rating' => $feedback->overall_rating,
            ]);

            return $feedback;
        });

        DB::afterCommit(fn () => event(new FeedbackSubmitted($feedback)));

        return $feedback;
    }

    /**
     * @param  list<int>  $participantIds
     */
    private function assertNoConflicts(array $participantIds, Carbon $start, int $duration, ?int $ignoreId = null): void
    {
        $end = $start->copy()->addMinutes($duration);

        $conflicts = Interview::query()
            ->with('participants:id,name')
            ->where('status', InterviewStatus::Scheduled->value)
            ->when($ignoreId, fn ($q, int $id) => $q->whereKeyNot($id))
            ->whereHas('participants', fn ($q) => $q->whereIn('users.id', $participantIds))
            ->where('scheduled_at', '<', $end)
            ->where('scheduled_at', '>', $start->copy()->subHours(8))
            ->get()
            ->filter(fn (Interview $other) => $other->endsAt()->greaterThan($start));

        if ($conflicts->isNotEmpty()) {
            $names = $conflicts->flatMap(fn (Interview $i) => $i->participants->whereIn('id', $participantIds)->pluck('name'))->unique()->implode(', ');

            throw new BusinessRuleException(
                "Scheduling conflict: {$names} already has an interview at this time.",
                'SCHEDULE_CONFLICT',
                409,
            );
        }
    }

    private function assertScheduled(Interview $interview): void
    {
        if ($interview->status !== InterviewStatus::Scheduled) {
            throw new BusinessRuleException('Only scheduled interviews can be changed.', 'INTERVIEW_NOT_SCHEDULED', 409);
        }
    }
}
