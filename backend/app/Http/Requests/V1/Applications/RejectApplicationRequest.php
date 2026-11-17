<?php

namespace App\Http\Requests\V1\Applications;

use App\Enums\RejectionReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RejectApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::enum(RejectionReason::class)],
            'note' => ['nullable', 'required_if:reason,other', 'string', 'max:2000'],
        ];
    }
}
