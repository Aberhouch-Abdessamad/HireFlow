<?php

namespace App\Http\Requests\V1\Applications;

use App\Http\Requests\V1\Candidates\UploadDocumentRequest;
use Illuminate\Foundation\Http\FormRequest;

class PublicApplyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+().\-\s]{6,40}$/'],
            'location' => ['nullable', 'string', 'max:150'],
            'linkedin_url' => ['nullable', 'url:https', 'max:255'],
            'portfolio_url' => ['nullable', 'url:https,http', 'max:255'],
            'cover_letter' => ['nullable', 'string', 'max:5000'],
            'cv' => UploadDocumentRequest::FILE_RULES,
            'consent' => ['accepted'],
            // Honeypot: real users never see or fill this field.
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'cv.mimes' => 'Upload your CV as a PDF or Word (.docx) file.',
            'cv.extensions' => 'Upload your CV as a PDF or Word (.docx) file.',
            'cv.max' => 'Your CV must be 5 MB or smaller.',
            'consent.accepted' => 'Please agree to the processing of your application data.',
        ];
    }
}
