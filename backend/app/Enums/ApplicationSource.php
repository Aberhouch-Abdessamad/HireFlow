<?php

namespace App\Enums;

enum ApplicationSource: string
{
    case CareersPage = 'careers_page';
    case Manual = 'manual';
    case Referral = 'referral';
    case Linkedin = 'linkedin';
    case Agency = 'agency';
    case Other = 'other';
}
