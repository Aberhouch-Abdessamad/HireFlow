<?php

namespace App\Models;

use App\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * A user's membership in a company (company_user).
 *
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property MembershipStatus $status
 */
class Membership extends Pivot
{
    protected $table = 'company_user';

    public $incrementing = true;

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'status' => MembershipStatus::class,
            'joined_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Company, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param Builder<self> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('company_user.status', MembershipStatus::Active->value)
            ->whereHas('company', static fn (Builder $company) => $company->where('is_active', true));
    }

    public function isActive(): bool
    {
        return $this->status === MembershipStatus::Active;
    }
}
