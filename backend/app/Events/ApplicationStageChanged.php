<?php

namespace App\Events;

use App\Models\Application;
use App\Models\ApplicationStageHistory;
use Illuminate\Foundation\Events\Dispatchable;

/** An application moved stage or changed status. Dispatched after commit. */
final class ApplicationStageChanged
{
    use Dispatchable;

    public function __construct(
        public readonly Application $application,
        public readonly ApplicationStageHistory $transition,
    ) {}
}
