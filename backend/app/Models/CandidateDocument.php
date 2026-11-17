<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A file stored on the private disk. `path` is internal and hidden from serialisation;
 * downloads go through an authorized controller.
 *
 * @property int $id
 * @property int $candidate_id
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size
 */
class CandidateDocument extends Model
{
    use BelongsToCompany;

    public const DISK = 'local';

    protected $fillable = ['type', 'original_name', 'mime_type', 'size'];

    protected $hidden = ['path'];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    /** @return BelongsTo<Candidate, $this> */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
