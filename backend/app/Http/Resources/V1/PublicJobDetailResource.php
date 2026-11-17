<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;

/** Public job page: listing fields plus description, requirements and skills. */
class PublicJobDetailResource extends PublicJobResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'description' => $this->description,
            'requirements' => $this->requirements,
            'skills' => $this->skills->map(fn ($skill) => [
                'name' => $skill->name,
                'is_required' => (bool) $skill->pivot->is_required,
            ])->values(),
        ];
    }
}
