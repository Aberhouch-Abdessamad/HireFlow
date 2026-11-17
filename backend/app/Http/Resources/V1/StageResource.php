<?php

namespace App\Http\Resources\V1;

use App\Models\RecruitmentStage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RecruitmentStage */
class StageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'position' => $this->position,
            'is_system' => $this->type->isSystem(),
            'applications_count' => $this->whenCounted('applications'),
        ];
    }
}
