<?php

namespace App\Models;

use App\Enums\ApplicationSource;
use App\Enums\ApplicationStatus;
use App\Enums\RejectionReason;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Links a candidate to a job and tracks their progress through the pipeline.
 *
 * @property int $id
 * @property int $company_id
 * @property int $job_posting_id
 * @property int $candidate_id
 * @property int $current_stage_id
 * @property ApplicationStatus $status
 * @property int|null $assigned_to
 */
class Application extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = ['source', 'cover_letter'];

    protected $attributes = ['status' => 'active'];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'source' => ApplicationSource::class,
            'rejection_reason' => RejectionReason::class,
            'rejected_at' => 'datetime',
            'hired_at' => 'datetime',
            'applied_at' => 'datetime',
            'stage_entered_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<JobPosting, $this> */
    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class)->withTrashed();
    }

    /** @return BelongsTo<Candidate, $this> */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class)->withTrashed();
    }

    /** @return BelongsTo<RecruitmentStage, $this> */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(RecruitmentStage::class, 'current_stage_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** @return HasMany<ApplicationStageHistory, $this> */
    public function history(): HasMany
    {
        return $this->hasMany(ApplicationStageHistory::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    /** @return HasMany<Interview, $this> */
    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class)->orderBy('scheduled_at');
    }

    /** @return HasMany<Offer, $this> */
    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class)->latest();
    }

    /** @return HasMany<ApplicationNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(ApplicationNote::class)->latest();
    }
}
