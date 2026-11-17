<?php

namespace App\Enums;

/** Status of a user's membership in a company (company_user.status). */
enum MembershipStatus: string
{
    case Active = 'active';
    case Deactivated = 'deactivated';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Deactivated => 'Deactivated',
        };
    }
}
