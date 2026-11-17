<?php

namespace App\Services\Candidates;

use App\Exceptions\BusinessRuleException;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use App\Models\CandidateNote;
use App\Models\Skill;
use App\Models\Tag;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class CandidateService
{
    private const ATTRIBUTES = [
        'first_name', 'last_name', 'email', 'phone', 'location', 'headline', 'linkedin_url', 'portfolio_url', 'source',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?User $actor): Candidate
    {
        $existing = Candidate::query()->where('email', Str::lower(trim((string) $data['email'])))->first();
        if ($existing !== null) {
            throw new BusinessRuleException(
                'A candidate with this email already exists (#'.$existing->id.').',
                'DUPLICATE_CANDIDATE',
                409,
            );
        }

        return DB::transaction(function () use ($data, $actor): Candidate {
            $candidate = new Candidate(Arr::only($data, self::ATTRIBUTES));
            $candidate->created_by = $actor?->id;
            $candidate->save();

            $this->syncProfile($candidate, $data);
            $this->audit->record('candidate.created', $candidate, null, ['email' => $candidate->email]);

            return $candidate;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Candidate $candidate, array $data): Candidate
    {
        if (isset($data['email'])) {
            $email = Str::lower(trim((string) $data['email']));
            $clash = Candidate::query()->where('email', $email)->whereKeyNot($candidate->id)->exists();
            if ($clash) {
                throw new BusinessRuleException('Another candidate already uses this email.', 'DUPLICATE_CANDIDATE', 409);
            }
        }

        return DB::transaction(function () use ($candidate, $data): Candidate {
            $candidate->fill(Arr::only($data, self::ATTRIBUTES));
            $changes = $candidate->getDirty();
            $candidate->save();
            $this->syncProfile($candidate, $data);

            if ($changes !== []) {
                $this->audit->record('candidate.updated', $candidate, null, ['fields' => array_keys($changes)]);
            }

            return $candidate;
        });
    }

    public function delete(Candidate $candidate): void
    {
        $candidate->delete();
        $this->audit->record('candidate.deleted', $candidate, ['email' => $candidate->email], null);
    }

    /**
     * Possible duplicates: same email, same phone (digits only) or same full name.
     *
     * @return Collection<int, Candidate>
     */
    public function findDuplicates(?string $email, ?string $phone, ?string $firstName, ?string $lastName, ?int $ignoreId = null): Collection
    {
        $phoneNormalized = Candidate::normalizePhone($phone);
        $email = $email ? Str::lower(trim($email)) : null;

        if (! $email && ! $phoneNormalized && ! ($firstName && $lastName)) {
            return new Collection;
        }

        return Candidate::query()
            ->where(function ($q) use ($email, $phoneNormalized, $firstName, $lastName): void {
                if ($email) {
                    $q->orWhere('email', $email);
                }
                if ($phoneNormalized) {
                    $q->orWhere('phone_normalized', $phoneNormalized);
                }
                if ($firstName && $lastName) {
                    $q->orWhere(fn ($n) => $n->where('first_name', $firstName)->where('last_name', $lastName));
                }
            })
            ->when($ignoreId, fn ($q, int $id) => $q->whereKeyNot($id))
            ->limit(10)
            ->get(['id', 'first_name', 'last_name', 'email', 'phone', 'headline']);
    }

    public function addNote(Candidate $candidate, string $body, User $author): CandidateNote
    {
        $note = new CandidateNote(['body' => $body]);
        $note->forceFill(['candidate_id' => $candidate->id, 'author_id' => $author->id])->save();

        return $note;
    }

    /**
     * Stores a CV/document on the private disk under a random name. The original name is kept
     * only as metadata.
     */
    public function storeDocument(Candidate $candidate, UploadedFile $file, string $type, ?User $uploader): CandidateDocument
    {
        $extension = strtolower($file->guessExtension() ?? $file->getClientOriginalExtension());
        $path = $file->storeAs(
            'candidates/'.$candidate->company_id.'/'.$candidate->id,
            Str::uuid()->toString().'.'.$extension,
            CandidateDocument::DISK,
        );

        try {
            $document = new CandidateDocument([
                'type' => $type,
                'original_name' => $this->safeFileName($file->getClientOriginalName(), $extension),
                'mime_type' => (string) $file->getMimeType(),
                'size' => (int) $file->getSize(),
            ]);
            $document->forceFill([
                'candidate_id' => $candidate->id,
                'company_id' => $candidate->company_id,
                'path' => $path,
                'uploaded_by' => $uploader?->id,
            ])->save();
        } catch (\Throwable $e) {
            Storage::disk(CandidateDocument::DISK)->delete($path);
            throw $e;
        }

        $this->audit->record('candidate.document_uploaded', $candidate, null, ['document_id' => $document->id, 'type' => $type], $candidate->company_id);

        return $document;
    }

    public function deleteDocument(CandidateDocument $document): void
    {
        Storage::disk(CandidateDocument::DISK)->delete($document->path);
        $document->delete();
        $this->audit->record('candidate.document_deleted', $document, ['original_name' => $document->original_name], null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncProfile(Candidate $candidate, array $data): void
    {
        if (array_key_exists('experiences', $data)) {
            $candidate->experiences()->delete();
            foreach ($data['experiences'] ?? [] as $experience) {
                $candidate->experiences()->create(Arr::only($experience, ['company_name', 'title', 'start_date', 'end_date', 'is_current', 'description']));
            }
        }

        if (array_key_exists('educations', $data)) {
            $candidate->educations()->delete();
            foreach ($data['educations'] ?? [] as $education) {
                $candidate->educations()->create(Arr::only($education, ['institution', 'degree', 'field_of_study', 'start_date', 'end_date']));
            }
        }

        if (array_key_exists('skills', $data)) {
            $ids = [];
            foreach ($data['skills'] ?? [] as $name) {
                $slug = Str::slug((string) $name);
                if ($slug !== '') {
                    $ids[] = Skill::query()->firstOrCreate(['slug' => $slug], ['name' => trim((string) $name)])->id;
                }
            }
            $candidate->skills()->sync(array_unique($ids));
        }

        if (array_key_exists('tags', $data)) {
            $ids = [];
            foreach ($data['tags'] ?? [] as $name) {
                $name = trim((string) $name);
                if ($name !== '') {
                    $ids[] = Tag::query()->firstOrCreate(['name' => $name])->id;
                }
            }
            $candidate->tags()->sync(array_unique($ids));
        }
    }

    private function safeFileName(string $name, string $extension): string
    {
        $base = Str::of(pathinfo($name, PATHINFO_FILENAME))->ascii()->replaceMatches('/[^A-Za-z0-9._ -]+/', '')->trim()->limit(100, '');

        return ($base->isEmpty() ? 'document' : (string) $base).'.'.$extension;
    }
}
