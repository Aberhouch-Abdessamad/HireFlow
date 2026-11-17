<?php

namespace App\Http\Resources\V1;

use App\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Public careers-site representation. Never exposes internal data (ids of staff, recruiters,
 * hidden salaries, creator, status history).
 *
 * @mixin JobPosting
 */
class PublicJobResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'location' => $this->location,
            'work_mode' => $this->work_mode->value,
            'employment_type' => $this->employment_type->value,
            'experience_level' => $this->experience_level->value,
            'department' => $this->department?->name,
            'salary' => $this->salary_visible && $this->salary_currency !== null ? [
                'min' => $this->salary_min,
                'max' => $this->salary_max,
                'currency' => $this->salary_currency,
            ] : null,
            'published_at' => $this->published_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'company' => [
                'name' => $this->company->name,
                'slug' => $this->company->slug,
                'logo_url' => $this->company->logo_path ? Storage::disk('public')->url($this->company->logo_path) : null,
            ],
        ];
    }
}
