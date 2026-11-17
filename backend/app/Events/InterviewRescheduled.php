<?php

namespace App\Events;

use App\Models\Interview;
use Illuminate\Foundation\Events\Dispatchable;

/** Dispatched after the database transaction commits. Notifications listen to it (Phase 6). */
final class InterviewRescheduled
{
    use Dispatchable;

    public function __construct(public readonly Interview $interview) {}
}
