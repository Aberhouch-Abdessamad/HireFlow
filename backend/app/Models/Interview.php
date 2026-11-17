<?php

namespace App\Models;

use App\Enums\InterviewStatus;
use App\Enums\InterviewType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property int $application_id
 * @property InterviewType $type
 * @property InterviewStatus $status
 * @property Carbon $scheduled_at
 * @property int $duration_minutes
 */
class Interview extends Model
{
    use BelongsToCompany;

    protected $fillable = ['type', 'scheduled_at', 'duration_minutes', 'timezone', 'meeting_url', 'location', 'agenda'];

    protected $attributes = ['status' => 'scheduled', 'timezone' => 'UTC'];

    protected function casts(): array
    {
        return [
            'type' => InterviewType::class,
            'status' => InterviewStatus::class,
            'scheduled_at' => 'datetime',
            'duration_minutes' => 'integer',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function endsAt(): Carbon
    {
        return $this->scheduled_at->copy()->addMinutes($this->duration_minutes);
    }

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'interview_participants');
    }

    /** @return HasMany<InterviewFeedback, $this> */
    public function feedback(): HasMany
    {
        return $this->hasMany(InterviewFeedback::class);
    }

    /** @return BelongsTo<User, $this> */
    public function scheduler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    public function hasParticipant(User $user): bool
    {
        return $this->participants()->whereKey($user->id)->exists();
    }
}
