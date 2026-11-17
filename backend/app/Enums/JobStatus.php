<?php

namespace App\Enums;

/**
 * Job posting lifecycle.
 *
 *   Draft ──publish──► Published ──pause──► Paused ──publish──► Published
 *     │                   │                   │
 *     │                   └──close──► Closed ◄┘──close
 *     │                               │  └──publish (reopen)──► Published
 *     └──archive──► Archived ◄──archive┘
 */
enum JobStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Paused = 'paused';
    case Closed = 'closed';
    case Archived = 'archived';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::Published, self::Archived],
            self::Published => [self::Paused, self::Closed],
            self::Paused => [self::Published, self::Closed],
            self::Closed => [self::Published, self::Archived],
            self::Archived => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    public function isEditable(): bool
    {
        return $this !== self::Archived;
    }

    public function isDeletable(): bool
    {
        return in_array($this, [self::Draft, self::Archived], true);
    }
}
