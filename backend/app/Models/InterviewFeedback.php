<?php

namespace App\Models;

use App\Enums\Recommendation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewFeedback extends Model
{
    protected $table = 'interview_feedback';

    protected $fillable = [
        'technical_score', 'communication_score', 'problem_solving_score', 'overall_rating', 'recommendation', 'comments',
    ];

    protected function casts(): array
    {
        return [
            'technical_score' => 'integer',
            'communication_score' => 'integer',
            'problem_solving_score' => 'integer',
            'overall_rating' => 'integer',
            'recommendation' => Recommendation::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Interview, $this> */
    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
