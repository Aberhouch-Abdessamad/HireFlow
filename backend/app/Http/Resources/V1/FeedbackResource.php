<?php

namespace App\Http\Resources\V1;

use App\Models\InterviewFeedback;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin InterviewFeedback */
class FeedbackResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author' => $this->whenLoaded('author', fn () => ['id' => $this->author->id, 'name' => $this->author->name]),
            'technical_score' => $this->technical_score,
            'communication_score' => $this->communication_score,
            'problem_solving_score' => $this->problem_solving_score,
            'overall_rating' => $this->overall_rating,
            'recommendation' => $this->recommendation->value,
            'recommendation_label' => $this->recommendation->label(),
            'comments' => $this->comments,
            'submitted_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
