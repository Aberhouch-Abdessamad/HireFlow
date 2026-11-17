<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 */
class Skill extends Model
{
    use BelongsToCompany;

    protected $fillable = ['name', 'slug'];
}
