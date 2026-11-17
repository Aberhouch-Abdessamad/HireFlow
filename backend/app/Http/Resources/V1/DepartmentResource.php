<?php

namespace App\Http\Resources\V1;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Department */
class DepartmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'job_postings_count' => $this->whenCounted('jobPostings'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
