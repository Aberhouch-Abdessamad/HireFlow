<?php

namespace App\Enums;

enum EmploymentType: string
{
    case FullTime = 'full_time';
    case PartTime = 'part_time';
    case Internship = 'internship';
    case Contract = 'contract';
    case Freelance = 'freelance';

    public function label(): string
    {
        return match ($this) {
            self::FullTime => 'Full-time',
            self::PartTime => 'Part-time',
            self::Internship => 'Internship',
            self::Contract => 'Contract',
            self::Freelance => 'Freelance',
        };
    }
}
