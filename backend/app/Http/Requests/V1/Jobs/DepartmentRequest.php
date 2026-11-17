<?php

namespace App\Http\Requests\V1\Jobs;

use App\Models\Department;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by DepartmentPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Department|null $department */
        $department = $this->route('department');

        return [
            'name' => [
                'required', 'string', 'min:2', 'max:100',
                Rule::unique('departments', 'name')
                    ->where('company_id', app(TenantContext::class)->id())
                    ->ignore($department?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
