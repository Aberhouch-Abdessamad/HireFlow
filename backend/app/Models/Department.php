<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $company_id
 * @property string $name
 */
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use BelongsToCompany, HasFactory;

    protected $fillable = ['name', 'description'];

    /** @return HasMany<JobPosting, $this> */
    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class);
    }
}
