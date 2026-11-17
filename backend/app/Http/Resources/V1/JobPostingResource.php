<?php

namespace App\Http\Resources\V1;

use App\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Internal (company-side) representation of a job posting.
 *
 * @mixin JobPosting
 */
class JobPostingResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'description' => $this->description,
            'requirements' => $this->requirements,
            'location' => $this->location,
            'work_mode' => $this->work_mode->value,
            'employment_type' => $this->employment_type->value,
            'experience_level' => $this->experience_level->value,
            'salary' => [
                'min' => $this->salary_min,
                'max' => $this->salary_max,
                'currency' => $this->salary_currency,
                'visible' => $this->salary_visible,
            ],
            'status' => $this->status->value,
            'available_transitions' => array_map(static fn ($s) => $s->value, $this->status->allowedTransitions()),
            'is_editable' => $this->status->isEditable(),
            'is_deletable' => $this->status->isDeletable(),
            'department' => $this->whenLoaded('department', fn () => $this->department ? [
                'id' => $this->department->id,
                'name' => $this->department->name,
            ] : null),
            'recruiters' => $this->whenLoaded('recruiters', fn () => $this->recruiters->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
            ])->values()),
            'skills' => $this->whenLoaded('skills', fn () => $this->skills->map(fn ($skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
                'is_required' => (bool) $skill->pivot->is_required,
            ])->values()),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'applications_count' => $this->whenCounted('applications'),
            'active_applications_count' => $this->whenCounted('active_applications'),
            'published_at' => $this->published_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
