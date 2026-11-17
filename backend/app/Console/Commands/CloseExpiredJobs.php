<?php

namespace App\Console\Commands;

use App\Enums\JobStatus;
use App\Models\JobPosting;
use App\Services\Audit\AuditLogger;
use Illuminate\Console\Command;

/** Closes published or paused jobs whose expiration date has passed (all companies). */
class CloseExpiredJobs extends Command
{
    protected $signature = 'jobs:close-expired';

    protected $description = 'Close job postings whose expiration date has passed';

    public function handle(AuditLogger $audit): int
    {
        $closed = 0;

        JobPosting::withoutGlobalScopes()
            ->whereIn('status', [JobStatus::Published->value, JobStatus::Paused->value])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->whereNull('deleted_at')
            ->chunkById(200, function ($jobs) use ($audit, &$closed): void {
                foreach ($jobs as $job) {
                    $from = $job->status->value;
                    $job->forceFill(['status' => JobStatus::Closed, 'closed_at' => now()])->save();
                    $audit->record('job.expired', $job, ['status' => $from], ['status' => 'closed'], $job->company_id, null);
                    $closed++;
                }
            });

        $this->info("Closed {$closed} expired job(s).");

        return self::SUCCESS;
    }
}
