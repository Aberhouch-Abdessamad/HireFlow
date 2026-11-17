<?php

namespace App\Services\Analytics;

use App\Enums\ApplicationStatus;
use App\Enums\InterviewStatus;
use App\Enums\JobStatus;
use App\Enums\OfferStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\Interview;
use App\Models\JobPosting;
use App\Models\Offer;
use App\Models\RecruitmentStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Personal "my work" dashboard for GET /dashboard/workspace.
 *
 * Everything is scoped to the signed-in member inside the active company:
 * applications assigned to them, interviews they organise or sit on, offers they
 * drafted and jobs they recruit for. Nothing here exposes other members' work.
 */
final class WorkspaceService
{
    /** An application is "stale" when it has sat in the same stage this long. */
    public const STALE_AFTER_DAYS = 7;

    /** @return array<string, mixed> */
    public function forUser(Company $company, User $user): array
    {
        $now = now();
        $myActive = fn (): Builder => Application::forCompany($company)
            ->where('assigned_to', $user->id)
            ->where('status', ApplicationStatus::Active->value);

        $myInterviews = fn (): Builder => Interview::forCompany($company)
            ->where(fn (Builder $q) => $q
                ->where('scheduled_by', $user->id)
                ->orWhereHas('participants', fn (Builder $p) => $p->whereKey($user->id)));

        $myOffers = fn (): Builder => Offer::forCompany($company)->where('created_by', $user->id);

        return [
            'kpi' => [
                'assigned_active' => $myActive()->count(),
                'new_this_week' => $myActive()->where('applied_at', '>=', $now->copy()->subDays(7))->count(),
                'stale' => $myActive()->where('stage_entered_at', '<', $now->copy()->subDays(self::STALE_AFTER_DAYS))->count(),
                'interviews_today' => $myInterviews()
                    ->where('status', InterviewStatus::Scheduled->value)
                    ->whereBetween('scheduled_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()])
                    ->count(),
                'interviews_this_week' => $myInterviews()
                    ->where('status', InterviewStatus::Scheduled->value)
                    ->whereBetween('scheduled_at', [$now, $now->copy()->addDays(7)])
                    ->count(),
                'pending_feedback' => $this->pendingFeedbackQuery($company, $user)->count(),
                'offers_in_progress' => $myOffers()
                    ->whereIn('status', [
                        OfferStatus::Draft->value,
                        OfferStatus::PendingApproval->value,
                        OfferStatus::Approved->value,
                        OfferStatus::Sent->value,
                    ])
                    ->count(),
            ],
            'offers_by_status' => $myOffers()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->map(fn ($total) => (int) $total),
            'pipeline' => $this->pipeline($company, $user),
            'needs_attention' => $myActive()
                ->with(['candidate', 'jobPosting', 'stage'])
                ->where('stage_entered_at', '<', $now->copy()->subDays(self::STALE_AFTER_DAYS))
                ->orderBy('stage_entered_at')
                ->limit(6)
                ->get()
                ->map(fn (Application $a) => [
                    'id' => $a->id,
                    'candidate' => $a->candidate->full_name,
                    'job' => $a->jobPosting->title,
                    'stage' => $a->stage->name,
                    'stage_type' => $a->stage->type->value,
                    'days_in_stage' => (int) $a->stage_entered_at->diffInDays($now),
                ])
                ->values(),
            'agenda' => $myInterviews()
                ->with(['application.candidate', 'application.jobPosting'])
                ->where('status', InterviewStatus::Scheduled->value)
                ->whereBetween('scheduled_at', [$now->copy()->startOfDay(), $now->copy()->addDays(7)])
                ->orderBy('scheduled_at')
                ->limit(8)
                ->get()
                ->map(fn (Interview $i) => [
                    'id' => $i->id,
                    'candidate' => $i->application->candidate->full_name,
                    'job' => $i->application->jobPosting->title,
                    'type' => $i->type->value,
                    'type_label' => $i->type->label(),
                    'scheduled_at' => $i->scheduled_at->toIso8601String(),
                    'ends_at' => $i->endsAt()->toIso8601String(),
                    'meeting_url' => $i->meeting_url,
                    'location' => $i->location,
                ])
                ->values(),
            'pending_feedback' => $this->pendingFeedbackQuery($company, $user)
                ->with(['application.candidate'])
                ->orderByDesc('scheduled_at')
                ->limit(5)
                ->get()
                ->map(fn (Interview $i) => [
                    'id' => $i->id,
                    'candidate' => $i->application->candidate->full_name,
                    'type_label' => $i->type->label(),
                    'scheduled_at' => $i->scheduled_at->toIso8601String(),
                ])
                ->values(),
            'jobs' => JobPosting::forCompany($company)
                ->whereHas('recruiters', fn (Builder $q) => $q->whereKey($user->id))
                ->whereIn('status', [JobStatus::Published->value, JobStatus::Paused->value])
                ->withCount([
                    'applications as active_count' => fn (Builder $q) => $q->where('status', ApplicationStatus::Active->value),
                    'applications as new_count' => fn (Builder $q) => $q->where('applied_at', '>=', $now->copy()->subDays(7)),
                ])
                ->orderByDesc('new_count')
                ->limit(6)
                ->get(['id', 'title', 'status', 'location', 'expires_at'])
                ->map(fn (JobPosting $job) => [
                    'id' => $job->id,
                    'title' => $job->title,
                    'status' => $job->status->value,
                    'location' => $job->location,
                    'expires_at' => $job->expires_at?->toIso8601String(),
                    'active_applications' => (int) $job->active_count,
                    'new_applications' => (int) $job->new_count,
                ])
                ->values(),
        ];
    }

    /**
     * Interviews the user sat on that have started, were not cancelled, and have no
     * feedback from them yet.
     *
     * @return Builder<Interview>
     */
    private function pendingFeedbackQuery(Company $company, User $user): Builder
    {
        return Interview::forCompany($company)
            ->whereHas('participants', fn (Builder $p) => $p->whereKey($user->id))
            ->where('status', '!=', InterviewStatus::Cancelled->value)
            ->where('scheduled_at', '<=', now())
            ->whereDoesntHave('feedback', fn (Builder $f) => $f->where('user_id', $user->id));
    }

    /**
     * Active applications assigned to the user, counted per pipeline stage (every
     * stage is listed, including empty ones, in pipeline order).
     *
     * @return list<array{id: int, name: string, type: string, count: int}>
     */
    private function pipeline(Company $company, User $user): array
    {
        $counts = Application::forCompany($company)
            ->where('assigned_to', $user->id)
            ->where('status', ApplicationStatus::Active->value)
            ->selectRaw('current_stage_id, count(*) as total')
            ->groupBy('current_stage_id')
            ->pluck('total', 'current_stage_id');

        return RecruitmentStage::forCompany($company)
            ->orderBy('position')
            ->get(['id', 'name', 'type', 'position'])
            ->map(fn (RecruitmentStage $stage) => [
                'id' => $stage->id,
                'name' => $stage->name,
                'type' => $stage->type->value,
                'count' => (int) ($counts[$stage->id] ?? 0),
            ])
            ->values()
            ->all();
    }
}
