<?php

namespace App\Events;

use App\Models\Application;
use Illuminate\Foundation\Events\Dispatchable;

/** A new application was created (careers page or manually). Dispatched after commit. */
final class ApplicationSubmitted
{
    use Dispatchable;

    public function __construct(public readonly Application $application) {}
}
