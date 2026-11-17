<?php

namespace App\Events;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/** Dispatched inside the registration transaction (e.g. to create default recruitment stages). */
final class CompanyRegistered
{
    use Dispatchable;

    public function __construct(
        public readonly Company $company,
        public readonly User $admin,
    ) {}
}
