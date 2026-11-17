<?php

namespace App\Http\Resources\V1;

use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Candidate */
class CandidateResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'location' => $this->location,
            'headline' => $this->headline,
            'linkedin_url' => $this->linkedin_url,
            'portfolio_url' => $this->portfolio_url,
            'source' => $this->source->value,
            'skills' => $this->whenLoaded('skills', fn () => $this->skills->pluck('name')->values()),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')->values()),
            'experiences' => $this->whenLoaded('experiences', fn () => $this->experiences->map(fn ($e) => [
                'id' => $e->id,
                'company_name' => $e->company_name,
                'title' => $e->title,
                'start_date' => $e->start_date?->toDateString(),
                'end_date' => $e->end_date?->toDateString(),
                'is_current' => $e->is_current,
                'description' => $e->description,
            ])->values()),
            'educations' => $this->whenLoaded('educations', fn () => $this->educations->map(fn ($e) => [
                'id' => $e->id,
                'institution' => $e->institution,
                'degree' => $e->degree,
                'field_of_study' => $e->field_of_study,
                'start_date' => $e->start_date?->toDateString(),
                'end_date' => $e->end_date?->toDateString(),
            ])->values()),
            'documents' => CandidateDocumentResource::collection($this->whenLoaded('documents')),
            'applications_count' => $this->whenCounted('applications'),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
