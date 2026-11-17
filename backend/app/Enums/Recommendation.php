<?php

namespace App\Enums;

enum Recommendation: string
{
    case StrongHire = 'strong_hire';
    case Hire = 'hire';
    case NoHire = 'no_hire';
    case StrongNoHire = 'strong_no_hire';

    public function label(): string
    {
        return match ($this) {
            self::StrongHire => 'Strong hire',
            self::Hire => 'Hire',
            self::NoHire => 'No hire',
            self::StrongNoHire => 'Strong no hire',
        };
    }

    public function isPositive(): bool
    {
        return in_array($this, [self::StrongHire, self::Hire], true);
    }
}
