<?php

namespace App\Http\Resources\V1;

use App\Models\Interview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Interview with the minimum candidate information interviewers need.
 *
 * @mixin Interview
 */
class InterviewResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'scheduled_at' => $this->scheduled_at->toIso8601String(),
            'ends_at' => $this->endsAt()->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'timezone' => $this->timezone,
            'meeting_url' => $this->meeting_url,
            'location' => $this->location,
            'agenda' => $this->agenda,
            'cancellation_reason' => $this->cancellation_reason,
            'application' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->id,
                'job' => ['id' => $this->application->jobPosting->id, 'title' => $this->application->jobPosting->title],
                'candidate' => [
                    'id' => $this->application->candidate->id,
                    'full_name' => $this->application->candidate->full_name,
                    'headline' => $this->application->candidate->headline,
                    'email' => $this->application->candidate->email,
                ],
                'stage' => $this->application->stage?->name,
                // CVs, downloadable through the interview so interviewers don't need talent-pool access.
                'documents' => $this->application->candidate->relationLoaded('documents')
                    ? $this->application->candidate->documents->map(fn ($d) => [
                        'id' => $d->id,
                        'original_name' => $d->original_name,
                        'mime_type' => $d->mime_type,
                        'size' => $d->size,
                        'download_url' => '/api/v1/interviews/'.$this->id.'/documents/'.$d->id.'/download',
                    ])->values()
                    : [],
            ]),
            'participants' => $this->whenLoaded('participants', fn () => $this->participants->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'has_submitted_feedback' => $this->relationLoaded('feedback') ? $this->feedback->contains('user_id', $u->id) : null,
            ])->values()),
            'feedback_count' => $this->whenLoaded('feedback', fn () => $this->feedback->count()),
            'scheduled_by' => $this->whenLoaded('scheduler', fn () => $this->scheduler?->name),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
