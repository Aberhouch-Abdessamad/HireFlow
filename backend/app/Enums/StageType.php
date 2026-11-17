<?php

namespace App\Enums;

/**
 * Semantic type of a recruitment stage. Companies can rename and add stages; business rules
 * use the type (e.g. only an accepted offer can move an application into a `hired` stage).
 */
enum StageType: string
{
    case Applied = 'applied';
    case Screening = 'screening';
    case Shortlist = 'shortlist';
    case Interview = 'interview';
    case Assessment = 'assessment';
    case Offer = 'offer';
    case Hired = 'hired';

    /** Stages every company must keep exactly one of. */
    public function isSystem(): bool
    {
        return in_array($this, [self::Applied, self::Hired], true);
    }

    /**
     * Default pipeline created for every new company.
     *
     * @return list<array{name: string, type: self}>
     */
    public static function defaultPipeline(): array
    {
        return [
            ['name' => 'Applied', 'type' => self::Applied],
            ['name' => 'CV Screening', 'type' => self::Screening],
            ['name' => 'Shortlisted', 'type' => self::Shortlist],
            ['name' => 'Interview', 'type' => self::Interview],
            ['name' => 'Assessment', 'type' => self::Assessment],
            ['name' => 'Offer', 'type' => self::Offer],
            ['name' => 'Hired', 'type' => self::Hired],
        ];
    }
}
