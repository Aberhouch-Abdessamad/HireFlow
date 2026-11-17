<?php

namespace App\Http\Requests\V1\Company;

use App\Enums\SystemRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by MembershipPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(array_map(static fn (SystemRole $r) => $r->value, SystemRole::companyRoles()))],
        ];
    }
}
