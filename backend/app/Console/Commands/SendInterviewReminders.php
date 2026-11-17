<?php

namespace App\Console\Commands;

use App\Enums\InterviewStatus;
use App\Models\Company;
use App\Models\Interview;
use App\Notifications\InterviewReminderNotification;
use App\Support\Tenancy\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Reminds everyone involved in an interview happening within the next 24 hours:
 * staff get the in-app notification plus an email, the candidate an email only.
 *
 * Idempotent: interviews are only reminded once (reminder_sent_at is set after
 * the notifications go out), so an hourly schedule does not spam duplicates.
 */
class SendInterviewReminders extends Command
{
    protected $signature = 'interviews:send-reminders';

    protected $description = 'Remind staff and candidates about interviews in the next 24 hours';

    public function handle(TenantContext $tenant): int
    {
        $start = now();
        $end = $start->copy()->addDay();
        $reminded = 0;

        Company::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->each(function (Company $company) use ($tenant, $start, $end, &$reminded): void {
                $reminded += $tenant->runAs($company, function () use ($company, $start, $end): int {
                    $interviews = Interview::forCompany($company)
                        ->where('status', InterviewStatus::Scheduled->value)
                        ->whereNull('reminder_sent_at')
                        ->whereBetween('scheduled_at', [$start, $end])
                        ->with(['application.jobPosting', 'application.candidate', 'participants'])
                        ->get();

                    foreach ($interviews as $interview) {
                        foreach ($interview->participants as $participant) {
                            $participant->notify(new InterviewReminderNotification($interview));
                        }

                        $candidate = $interview->application->candidate;

                        if ($candidate !== null) {
                            Notification::route('mail', $candidate->email)
                                ->notify(new InterviewReminderNotification($interview));
                        }

                        $interview->forceFill(['reminder_sent_at' => now()])->save();
                    }

                    return count($interviews);
                });
            });

        $this->info("Sent reminders for {$reminded} interview(s).");

        return self::SUCCESS;
    }
}
