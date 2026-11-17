<?php

namespace App\Events;

use App\Models\InterviewFeedback;
use Illuminate\Foundation\Events\Dispatchable;

/** Dispatched after the database transaction commits. Notifications listen to it (Phase 6). */
final class FeedbackSubmitted
{
    use Dispatchable;

    public function __construct(public readonly InterviewFeedback $feedback) {}
}
