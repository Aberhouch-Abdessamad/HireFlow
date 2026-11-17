<?php

namespace App\Http\Requests\V1\Offers;

use App\Enums\EmploymentType;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by OfferPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $creating = $this->isMethod('POST');
        $required = $creating ? 'required' : 'sometimes';

        return [
            'application_id' => [
                Rule::requiredIf($creating), 'integer',
                Rule::exists('applications', 'id')->where('company_id', app(TenantContext::class)->id())->whereNull('deleted_at'),
            ],
            'salary_amount' => [$required, 'integer', 'min:1', 'max:100000000'],
            'currency' => [$required, 'string', 'size:3', 'alpha', 'uppercase'],
            'contract_type' => [$required, Rule::enum(EmploymentType::class)],
            'start_date' => [$required, 'date', 'after:today'],
            'expires_at' => [$required, 'date', 'after:now', 'before:start_date'],
            'message' => ['nullable', 'string', 'max:5000'],
            'internal_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['expires_at.before' => 'The response deadline must be before the start date.'];
    }
}
