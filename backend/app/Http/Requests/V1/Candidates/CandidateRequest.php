<?php

namespace App\Http\Requests\V1\Candidates;

use App\Enums\ApplicationSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CandidateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by CandidatePolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'first_name' => [$required, 'string', 'max:80'],
            'last_name' => [$required, 'string', 'max:80'],
            'email' => [$required, 'string', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+().\-\s]{6,40}$/'],
            'location' => ['nullable', 'string', 'max:150'],
            'headline' => ['nullable', 'string', 'max:150'],
            'linkedin_url' => ['nullable', 'url:https', 'max:255', 'regex:/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i'],
            'portfolio_url' => ['nullable', 'url:https,http', 'max:255'],
            'source' => ['sometimes', Rule::enum(ApplicationSource::class)],
            'skills' => ['sometimes', 'array', 'max:50'],
            'skills.*' => ['string', 'min:1', 'max:80'],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['string', 'min:1', 'max:50'],
            'experiences' => ['sometimes', 'array', 'max:30'],
            'experiences.*.company_name' => ['required', 'string', 'max:120'],
            'experiences.*.title' => ['required', 'string', 'max:120'],
            'experiences.*.start_date' => ['nullable', 'date', 'before_or_equal:today'],
            'experiences.*.end_date' => ['nullable', 'date', 'after_or_equal:experiences.*.start_date'],
            'experiences.*.is_current' => ['sometimes', 'boolean'],
            'experiences.*.description' => ['nullable', 'string', 'max:2000'],
            'educations' => ['sometimes', 'array', 'max:20'],
            'educations.*.institution' => ['required', 'string', 'max:150'],
            'educations.*.degree' => ['nullable', 'string', 'max:120'],
            'educations.*.field_of_study' => ['nullable', 'string', 'max:120'],
            'educations.*.start_date' => ['nullable', 'date'],
            'educations.*.end_date' => ['nullable', 'date', 'after_or_equal:educations.*.start_date'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['linkedin_url.regex' => 'Enter a LinkedIn profile URL (https://linkedin.com/...).'];
    }
}
