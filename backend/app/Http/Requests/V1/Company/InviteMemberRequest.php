<?php

namespace App\Http\Requests\V1\Company;

use App\Enums\SystemRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InviteMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by InvitationPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'role' => ['required', Rule::in(array_map(static fn (SystemRole $r) => $r->value, SystemRole::companyRoles()))],
        ];
    }
}
