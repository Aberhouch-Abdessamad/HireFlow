<?php

namespace App\Http\Resources\V1;

use App\Models\Offer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Offer as the candidate sees it: no internal notes, approvals or staff names.
 * Load `application.jobPosting` and `application.company` (tenant scope removed) first.
 *
 * @mixin Offer
 */
class CandidateOfferResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $application = $this->application;

        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'salary_amount' => $this->salary_amount,
            'currency' => $this->currency,
            'contract_type' => $this->contract_type->value,
            'start_date' => $this->start_date->toDateString(),
            'expires_at' => $this->expires_at->toIso8601String(),
            'message' => $this->message,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'responded_at' => $this->responded_at?->toIso8601String(),
            'job_title' => $application->jobPosting->title,
            'company' => [
                'name' => $application->company->name,
                'logo_url' => $application->company->logo_path ? Storage::disk('public')->url($application->company->logo_path) : null,
            ],
            'candidate_first_name' => $application->candidate->first_name,
        ];
    }
}
