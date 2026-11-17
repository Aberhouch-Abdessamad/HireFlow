<?php

namespace App\Http\Requests\V1\Company;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by CompanyPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'website' => ['nullable', 'url:https,http', 'max:255'],
            'industry' => ['nullable', 'string', 'max:100'],
            'size' => ['nullable', 'string', 'in:1-10,11-50,51-200,201-500,500+'],
            'country' => ['nullable', 'string', 'size:2', 'alpha'],
            'timezone' => ['required', 'timezone:all'],
            'description' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
