<?php

namespace App\Models;

use App\Observers\CompanyObserver;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A tenant. Every company-owned record points to a company through `company_id`.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property bool $is_active
 */
#[ObservedBy(CompanyObserver::class)]
#[Fillable(['name', 'slug', 'website', 'industry', 'size', 'country', 'timezone', 'description'])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory, SoftDeletes;

    protected $attributes = [
        'timezone' => 'UTC',
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    /** @return BelongsToMany<User, $this, Membership> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_user')
            ->using(Membership::class)
            ->withPivot(['id', 'status', 'job_title', 'joined_at'])
            ->withTimestamps();
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }
}
