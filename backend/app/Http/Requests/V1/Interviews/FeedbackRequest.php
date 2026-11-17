<?php

namespace App\Http\Requests\V1\Interviews;

use App\Enums\Recommendation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized by InterviewPolicy in the controller.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $score = ['required', 'integer', 'between:1,5'];

        return [
            'technical_score' => $score,
            'communication_score' => $score,
            'problem_solving_score' => $score,
            'overall_rating' => $score,
            'recommendation' => ['required', Rule::enum(Recommendation::class)],
            'comments' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
