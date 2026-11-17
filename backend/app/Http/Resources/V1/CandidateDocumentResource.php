<?php

namespace App\Http\Resources\V1;

use App\Models\CandidateDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Never includes the storage path. Files are downloaded through the authorized endpoint.
 *
 * @mixin CandidateDocument
 */
class CandidateDocumentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader?->name),
            'download_url' => '/api/v1/candidates/'.$this->candidate_id.'/documents/'.$this->id.'/download',
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
