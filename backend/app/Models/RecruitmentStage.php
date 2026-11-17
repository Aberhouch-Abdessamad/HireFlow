<?php

namespace App\Models;

use App\Enums\StageType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property StageType $type
 * @property int $position
 */
class RecruitmentStage extends Model
{
    use BelongsToCompany;

    protected $fillable = ['name', 'type', 'position'];

    protected function casts(): array
    {
        return ['type' => StageType::class, 'position' => 'integer'];
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'current_stage_id');
    }
}
