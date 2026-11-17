<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Candidate notes and application comments. */
class NoteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'author' => $this->whenLoaded('author', fn () => $this->author ? ['id' => $this->author->id, 'name' => $this->author->name] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
