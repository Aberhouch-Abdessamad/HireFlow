<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/** Append-only stage/status transition record. */
class ApplicationStageHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'application_stage_history';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(static fn () => throw new LogicException('Stage history is append-only.'));
        static::deleting(static fn () => throw new LogicException('Stage history is append-only.'));
    }

    /** @return BelongsTo<RecruitmentStage, $this> */
    public function fromStage(): BelongsTo
    {
        return $this->belongsTo(RecruitmentStage::class, 'from_stage_id');
    }

    /** @return BelongsTo<RecruitmentStage, $this> */
    public function toStage(): BelongsTo
    {
        return $this->belongsTo(RecruitmentStage::class, 'to_stage_id');
    }

    /** @return BelongsTo<User, $this> */
    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
