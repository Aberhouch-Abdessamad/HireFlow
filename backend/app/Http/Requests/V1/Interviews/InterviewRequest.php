<?php

namespace App\Http\Requests\V1\Interviews;

use App\Enums\InterviewType;
use App\Enums\MembershipStatus;
use App\Models\Interview;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InterviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by InterviewPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $companyId = app(TenantContext::class)->id();
        $creating = $this->isMethod('POST');
        $required = $creating ? 'required' : 'sometimes';

        // A remote interview needs a meeting link, an onsite one a location. On update
        // the stored interview usually already complies, so only demand a fresh link
        // (or location) when the stored values would not satisfy the invariant.
        $interview = $this->route('interview');
        $alreadyCovered = ! $creating && $interview instanceof Interview
            && ($interview->meeting_url !== null || $interview->location !== null);

        return [
            'application_id' => [
                Rule::requiredIf($creating), 'integer',
                Rule::exists('applications', 'id')->where('company_id', $companyId)->whereNull('deleted_at'),
            ],
            'type' => [$required, Rule::enum(InterviewType::class)],
            'scheduled_at' => [$required, 'date', 'after:now'],
            'duration_minutes' => [$required, 'integer', 'min:15', 'max:480'],
            'timezone' => ['sometimes', 'timezone:all'],
            'meeting_url' => ['nullable', 'url:https', 'max:255', ...$alreadyCovered ? [] : ['required_without:location']],
            'location' => ['nullable', 'string', 'max:200'],
            'agenda' => ['nullable', 'string', 'max:5000'],
            'participant_ids' => [$required, 'array', 'min:1', 'max:10'],
            'participant_ids.*' => [
                'integer', 'distinct',
                Rule::exists('company_user', 'user_id')->where('company_id', $companyId)->where('status', MembershipStatus::Active->value),
            ],
            'force' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'scheduled_at.after' => 'Interviews must be scheduled in the future.',
            'meeting_url.required_without' => 'Add a meeting link or a location.',
            'participant_ids.*.exists' => 'Interviewers must be active members of your company.',
        ];
    }
}
