<?php

namespace App\Http\Requests\V1\Jobs;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\MembershipStatus;
use App\Enums\WorkMode;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates job create/update payloads. Department and recruiter ids must belong to the
 * active company, so a client can't link records across tenants.
 */
class JobPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by JobPostingPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $companyId = app(TenantContext::class)->id();
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'min:3', 'max:150'],
            'description' => [$required, 'string', 'min:20', 'max:20000'],
            'requirements' => ['nullable', 'string', 'max:20000'],
            'location' => ['nullable', 'string', 'max:150'],
            'work_mode' => [$required, Rule::enum(WorkMode::class)],
            'employment_type' => [$required, Rule::enum(EmploymentType::class)],
            'experience_level' => [$required, Rule::enum(ExperienceLevel::class)],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('company_id', $companyId)],
            'salary_min' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'salary_max' => ['nullable', 'integer', 'min:0', 'max:100000000', 'gte:salary_min'],
            'salary_currency' => ['nullable', 'required_with:salary_min,salary_max', 'string', 'size:3', 'alpha', 'uppercase'],
            'salary_visible' => ['sometimes', 'boolean'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'recruiter_ids' => ['sometimes', 'array', 'max:20'],
            'recruiter_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('company_user', 'user_id')
                    ->where('company_id', $companyId)
                    ->where('status', MembershipStatus::Active->value),
            ],
            'skills' => ['sometimes', 'array', 'max:30'],
            'skills.*.name' => ['required', 'string', 'min:1', 'max:80'],
            'skills.*.is_required' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'salary_max.gte' => 'The maximum salary must be greater than or equal to the minimum.',
            'expires_at.after' => 'The expiration date must be in the future.',
            'recruiter_ids.*.exists' => 'Recruiters must be active members of your company.',
            'department_id.exists' => 'The selected department does not exist.',
        ];
    }
}
