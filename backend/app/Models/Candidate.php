<?php

namespace App\Models;

use App\Enums\ApplicationSource;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\CandidateFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $company_id
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string|null $phone
 */
class Candidate extends Model
{
    /** @use HasFactory<CandidateFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name', 'last_name', 'email', 'phone', 'location', 'headline', 'linkedin_url', 'portfolio_url', 'source',
    ];

    /** Mirrors the database default so freshly created models never expose a null source. */
    protected $attributes = [
        'source' => 'manual',
    ];

    protected function casts(): array
    {
        return ['source' => ApplicationSource::class];
    }

    protected static function booted(): void
    {
        static::saving(static function (self $candidate): void {
            $candidate->email = mb_strtolower(trim($candidate->email));
            $candidate->phone_normalized = self::normalizePhone($candidate->phone);
        });
    }

    public static function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone) ?? '';

        // "00" is the international dialing prefix, so 002126... and +212... are the
        // same number. Strip it to keep both spellings comparable.
        if (strlen($digits) >= 3 && str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        return strlen($digits) >= 6 ? $digits : null;
    }

    /** @return Attribute<string, never> */
    protected function fullName(): Attribute
    {
        return Attribute::get(fn () => trim($this->first_name.' '.$this->last_name));
    }

    /** @return HasMany<CandidateExperience, $this> */
    public function experiences(): HasMany
    {
        return $this->hasMany(CandidateExperience::class)->orderByDesc('is_current')->orderByDesc('start_date');
    }

    /** @return HasMany<CandidateEducation, $this> */
    public function educations(): HasMany
    {
        return $this->hasMany(CandidateEducation::class)->orderByDesc('start_date');
    }

    /** @return BelongsToMany<Skill, $this> */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'candidate_skill');
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'candidate_tag');
    }

    /** @return HasMany<CandidateNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(CandidateNote::class)->latest();
    }

    /** @return HasMany<CandidateDocument, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(CandidateDocument::class)->latest();
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
