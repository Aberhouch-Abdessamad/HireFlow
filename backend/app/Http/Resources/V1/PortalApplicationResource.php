<?php

namespace App\Http\Resources\V1;

use App\Enums\ApplicationStatus;
use App\Enums\StageType;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Application as the candidate sees it. Internal stage names, rejection reasons, notes and
 * assignees are never exposed; the progress is a simplified, candidate-friendly status.
 *
 * @mixin Application
 */
class PortalApplicationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'progress' => $this->progress(),
            'applied_at' => $this->applied_at?->toIso8601String(),
            'job' => [
                'title' => $this->jobPosting->title,
                'slug' => $this->jobPosting->slug,
                'location' => $this->jobPosting->location,
            ],
            'company' => [
                'name' => $this->company->name,
                'slug' => $this->company->slug,
                'logo_url' => $this->company->logo_path ? Storage::disk('public')->url($this->company->logo_path) : null,
            ],
            'upcoming_interviews' => $this->whenLoaded('interviews', fn () => $this->interviews
                ->filter(fn ($i) => $i->status->value === 'scheduled' && $i->scheduled_at->isFuture())
                ->map(fn ($i) => [
                    'id' => $i->id,
                    'type_label' => $i->type->label(),
                    'scheduled_at' => $i->scheduled_at->toIso8601String(),
                    'duration_minutes' => $i->duration_minutes,
                    'meeting_url' => $i->meeting_url,
                    'location' => $i->location,
                ])->values()),
        ];
    }

    /** received → in_review → interviewing → offer → hired, or not_selected / withdrawn. */
    private function progress(): string
    {
        return match ($this->status) {
            ApplicationStatus::Rejected => 'not_selected',
            ApplicationStatus::Withdrawn => 'withdrawn',
            ApplicationStatus::Hired => 'hired',
            ApplicationStatus::Active => match ($this->stage->type) {
                StageType::Applied => 'received',
                StageType::Screening, StageType::Shortlist => 'in_review',
                StageType::Interview, StageType::Assessment => 'interviewing',
                StageType::Offer => 'offer',
                StageType::Hired => 'hired',
            },
        };
    }
}
