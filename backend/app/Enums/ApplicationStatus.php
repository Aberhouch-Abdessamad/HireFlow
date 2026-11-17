<?php

namespace App\Enums;

/** Rejected and withdrawn are statuses, not stages: the application keeps the stage it left from. */
enum ApplicationStatus: string
{
    case Active = 'active';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';
    case Hired = 'hired';

    public function isOpen(): bool
    {
        return $this === self::Active;
    }
}
