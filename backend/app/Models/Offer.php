<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\OfferStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property int $application_id
 * @property OfferStatus $status
 * @property Carbon $expires_at
 */
class Offer extends Model
{
    use BelongsToCompany;

    protected $fillable = ['salary_amount', 'currency', 'contract_type', 'start_date', 'expires_at', 'message', 'internal_notes'];

    protected $hidden = ['response_token_hash'];

    protected $attributes = ['status' => 'draft'];

    protected function casts(): array
    {
        return [
            'status' => OfferStatus::class,
            'contract_type' => EmploymentType::class,
            'salary_amount' => 'integer',
            'start_date' => 'date',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'sent_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
