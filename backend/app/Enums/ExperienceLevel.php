<?php

namespace App\Enums;

enum ExperienceLevel: string
{
    case Entry = 'entry';
    case Junior = 'junior';
    case Mid = 'mid';
    case Senior = 'senior';
    case Lead = 'lead';
    case Executive = 'executive';

    public function label(): string
    {
        return match ($this) {
            self::Entry => 'Entry level',
            self::Junior => 'Junior',
            self::Mid => 'Mid-level',
            self::Senior => 'Senior',
            self::Lead => 'Lead / Principal',
            self::Executive => 'Executive',
        };
    }
}
