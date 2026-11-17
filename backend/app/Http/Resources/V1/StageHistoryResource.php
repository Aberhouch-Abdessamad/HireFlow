<?php

namespace App\Http\Resources\V1;

use App\Models\ApplicationStageHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ApplicationStageHistory */
class StageHistoryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from_stage' => $this->fromStage?->name,
            'to_stage' => $this->toStage?->name,
            'from_status' => $this->from_status,
            'to_status' => $this->to_status,
            'performed_by' => $this->performer?->name,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
