<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkMode;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\JobPostingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A job offer published by a company. The table is `job_postings` (Laravel's queue uses `jobs`).
 *
 * @property int $id
 * @property int $company_id
 * @property string $slug
 * @property string $title
 * @property JobStatus $status
 * @property Carbon|null $published_at
 * @property Carbon|null $expires_at
 * @property Carbon|null $closed_at
 */
class JobPosting extends Model
{
    /** @use HasFactory<JobPostingFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'description', 'requirements', 'location', 'work_mode', 'employment_type',
        'experience_level', 'salary_min', 'salary_max', 'salary_currency', 'salary_visible', 'expires_at',
    ];

    protected $attributes = [
        'status' => 'draft',
        'work_mode' => 'onsite',
        'salary_visible' => false,
    ];

    protected function casts(): array
    {
        return [
            'status' => JobStatus::class,
            'employment_type' => EmploymentType::class,
            'experience_level' => ExperienceLevel::class,
            'work_mode' => WorkMode::class,
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'salary_visible' => 'boolean',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Department, $this> */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /** @return BelongsToMany<Skill, $this> */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'job_posting_skill')->withPivot('is_required');
    }

    /** @return BelongsToMany<User, $this> */
    public function recruiters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'job_posting_recruiter');
    }

    /**
     * Jobs visible on the public careers site: published, not expired, from an active company.
     * Works without a tenant context (public endpoints).
     *
     * @param  Builder<self>  $query
     */
    public function scopePubliclyVisible(Builder $query): void
    {
        $query->withoutGlobalScope(Scopes\CompanyScope::class)
            ->where('job_postings.status', JobStatus::Published->value)
            ->where(fn (Builder $q) => $q->whereNull('job_postings.expires_at')->orWhere('job_postings.expires_at', '>', now()))
            ->whereHas('company', fn (Builder $q) => $q->where('is_active', true));
    }
}
