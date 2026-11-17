<?php

namespace App\Enums;

enum InterviewType: string
{
    case Hr = 'hr';
    case Technical = 'technical';
    case Behavioral = 'behavioral';
    case Final = 'final';

    public function label(): string
    {
        return match ($this) {
            self::Hr => 'HR interview',
            self::Technical => 'Technical interview',
            self::Behavioral => 'Behavioral interview',
            self::Final => 'Final interview',
        };
    }
}
