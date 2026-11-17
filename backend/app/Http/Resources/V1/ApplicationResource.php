<?php

namespace App\Http\Resources\V1;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Application */
class ApplicationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'source' => $this->source->value,
            'cover_letter' => $this->cover_letter,
            'stage' => $this->whenLoaded('stage', fn () => [
                'id' => $this->stage->id,
                'name' => $this->stage->name,
                'type' => $this->stage->type->value,
            ]),
            'job' => $this->whenLoaded('jobPosting', fn () => [
                'id' => $this->jobPosting->id,
                'title' => $this->jobPosting->title,
                'status' => $this->jobPosting->status->value,
            ]),
            'candidate' => $this->whenLoaded('candidate', fn () => [
                'id' => $this->candidate->id,
                'full_name' => $this->candidate->full_name,
                'email' => $this->candidate->email,
                'headline' => $this->candidate->headline,
                'location' => $this->candidate->location,
            ]),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name] : null),
            'rejection' => $this->rejected_at ? [
                'reason' => $this->rejection_reason?->value,
                'reason_label' => $this->rejection_reason?->label(),
                'note' => $this->rejection_note,
                'rejected_at' => $this->rejected_at->toIso8601String(),
            ] : null,
            'applied_at' => $this->applied_at?->toIso8601String(),
            'stage_entered_at' => $this->stage_entered_at?->toIso8601String(),
            'hired_at' => $this->hired_at?->toIso8601String(),
        ];
    }
}
