<?php

namespace App\Http\Resources\V1;

use App\Models\Offer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Internal (company-side) offer. @mixin Offer */
class OfferResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'salary_amount' => $this->salary_amount,
            'currency' => $this->currency,
            'contract_type' => $this->contract_type->value,
            'start_date' => $this->start_date->toDateString(),
            'expires_at' => $this->expires_at->toIso8601String(),
            'message' => $this->message,
            'internal_notes' => $this->internal_notes,
            'approval_comment' => $this->approval_comment,
            'response_note' => $this->response_note,
            'application' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->id,
                'status' => $this->application->status->value,
                'job' => ['id' => $this->application->jobPosting->id, 'title' => $this->application->jobPosting->title],
                'candidate' => [
                    'id' => $this->application->candidate->id,
                    'full_name' => $this->application->candidate->full_name,
                    'email' => $this->application->candidate->email,
                ],
            ]),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'approved_by' => $this->whenLoaded('approver', fn () => $this->approver?->name),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'sent_at' => $this->sent_at?->toIso8601String(),
            'responded_at' => $this->responded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
