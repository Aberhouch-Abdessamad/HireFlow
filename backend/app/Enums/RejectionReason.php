<?php

namespace App\Enums;

enum RejectionReason: string
{
    case NotQualified = 'not_qualified';
    case InsufficientExperience = 'insufficient_experience';
    case SkillsMismatch = 'skills_mismatch';
    case CultureFit = 'culture_fit';
    case SalaryExpectations = 'salary_expectations';
    case PositionFilled = 'position_filled';
    case FailedAssessment = 'failed_assessment';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NotQualified => 'Does not meet requirements',
            self::InsufficientExperience => 'Insufficient experience',
            self::SkillsMismatch => 'Skills mismatch',
            self::CultureFit => 'Team or culture fit',
            self::SalaryExpectations => 'Salary expectations',
            self::PositionFilled => 'Position filled',
            self::FailedAssessment => 'Did not pass assessment',
            self::Other => 'Other',
        };
    }
}
