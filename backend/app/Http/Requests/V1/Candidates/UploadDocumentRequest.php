<?php

namespace App\Http\Requests\V1\Candidates;

use Illuminate\Foundation\Http\FormRequest;

/**
 * CV uploads: PDF or DOCX only, at most 5 MB. `mimes` checks the detected content type
 * (not just the client-provided extension), and `extensions` checks the file name.
 */
class UploadDocumentRequest extends FormRequest
{
    public const FILE_RULES = ['required', 'file', 'max:5120', 'mimes:pdf,docx', 'extensions:pdf,docx'];

    public function authorize(): bool
    {
        return true; // Authorized by CandidatePolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'file' => self::FILE_RULES,
            'type' => ['sometimes', 'in:cv,cover_letter,portfolio,other'],
        ];
    }
}
