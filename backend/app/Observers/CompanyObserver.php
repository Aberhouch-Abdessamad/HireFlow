<?php

namespace App\Observers;

use App\Models\Company;
use App\Services\Pipeline\PipelineStageService;

class CompanyObserver
{
    public function __construct(private readonly PipelineStageService $stages) {}

    /** Every new company starts with the default recruitment pipeline. */
    public function created(Company $company): void
    {
        $this->stages->createDefaults($company);
    }
}
