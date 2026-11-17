<?php

namespace Tests\Feature\Notifications;

use App\Enums\RejectionReason;
use App\Enums\SystemRole;
use App\Models\Company;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Notifications\ApplicationStageChangedNotification;
use App\Notifications\ApplicationSubmittedNotification;
use App\Notifications\FeedbackSubmittedNotification;
use App\Notifications\InterviewCancelledNotification;
use App\Notifications\InterviewReminderNotification;
use App\Notifications\InterviewRescheduledNotification;
use App\Notifications\InterviewScheduledNotification;
use App\Notifications\OfferAcceptedNotification;
use App\Notifications\OfferDeclinedNotification;
use App\Notifications\OfferSubmittedForApprovalNotification;
use App\Services\Applications\ApplicationService;
use App\Services\Interviews\InterviewService;
use App\Services\Offers\OfferService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    /**
     * Full member roster: admin (Company Admin), hr (HR Manager),
     * recruiter (Recruiter), interviewer (Interviewer).
     *
     * @return array{0: Company, 1: User, 2: User, 3: User, 4: User}
     */
    private function team(): array
    {
        [$company, $admin] = $this->companyWithAdmin();
        $hr = $this->addMember($company, User::factory()->create(), SystemRole::HrManager);
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);

        return [$company, $admin, $hr, $recruiter, $interviewer];
    }

    public function test_new_applications_notify_everyone_who_can_assign(): void
    {
        Notification::fake();
        [$company, $admin, $hr, $recruiter, $interviewer] = $this->team();
        [, $otherAdmin] = $this->companyWithAdmin();

        $this->makeApplication($company);

        Notification::assertSentTo([$admin, $hr, $recruiter], ApplicationSubmittedNotification::class);
        Notification::assertSentTo($admin, ApplicationSubmittedNotification::class, fn ($notification, $channels) => $channels === ['database']);
        Notification::assertNotSentTo($interviewer, ApplicationSubmittedNotification::class);
        Notification::assertNotSentTo($otherAdmin, ApplicationSubmittedNotification::class);
    }

    public function test_deactivated_members_are_not_notified(): void
    {
        Notification::fake();
        [$company, $admin] = $this->companyWithAdmin();
        $admin->forceFill(['is_active' => false])->save();

        $this->makeApplication($company);

        Notification::assertNothingSent();
    }

    public function test_stage_changes_notify_the_assignee_but_not_the_performer(): void
    {
        Notification::fake();
        [$company, $admin, , $recruiter] = $this->team();
        $application = $this->makeApplication($company);

        app(TenantContext::class)->runAs($company, function () use ($application, $recruiter, $admin): void {
            app(ApplicationService::class)->assign($application, $recruiter);

            $screening = RecruitmentStage::where('type', 'screening')->firstOrFail();
            app(ApplicationService::class)->moveToStage($application, $screening, 'Looks promising', $admin);
        });

        Notification::assertSentTo($recruiter, ApplicationStageChangedNotification::class, fn (ApplicationStageChangedNotification $notification): bool => str_contains($notification->message(), 'moved to'));
        Notification::assertNotSentTo($admin, ApplicationStageChangedNotification::class);
    }

    public function test_rejections_reach_the_assignee_with_the_right_message(): void
    {
        Notification::fake();
        [$company, $admin, , $recruiter] = $this->team();
        $application = $this->makeApplication($company);

        app(TenantContext::class)->runAs($company, function () use ($application, $recruiter, $admin): void {
            app(ApplicationService::class)->assign($application, $recruiter);
            app(ApplicationService::class)->reject($application, RejectionReason::SkillsMismatch, 'Better fit elsewhere', $admin);
        });

        Notification::assertSentTo($recruiter, ApplicationStageChangedNotification::class, fn (ApplicationStageChangedNotification $notification): bool => str_contains($notification->message(), 'rejected'));
        Notification::assertNotSentTo($admin, ApplicationStageChangedNotification::class);
    }

    public function test_interview_lifecycle_notifications_reach_the_right_people(): void
    {
        Notification::fake();
        [$company, , $hr, $recruiter, $interviewer] = $this->team();
        $application = $this->makeApplication($company);

        $interview = app(TenantContext::class)->runAs($company, fn () => app(InterviewService::class)->schedule($application, [
            'type' => 'technical',
            'scheduled_at' => now()->addDays(2)->format('Y-m-d H:i:s'),
            'duration_minutes' => 60,
            'location' => 'Room 1',
            'participant_ids' => [$interviewer->id, $hr->id],
        ], $recruiter));

        Notification::assertSentTo([$interviewer, $hr], InterviewScheduledNotification::class);
        Notification::assertNotSentTo($recruiter, InterviewScheduledNotification::class);

        app(TenantContext::class)->runAs($company, fn () => app(InterviewService::class)->update($interview, [
            'scheduled_at' => now()->addDays(3)->format('Y-m-d H:i:s'),
        ]));

        Notification::assertSentTo([$interviewer, $hr, $recruiter], InterviewRescheduledNotification::class);

        app(TenantContext::class)->runAs($company, fn () => app(InterviewService::class)->cancel($interview, 'Candidate unavailable'));

        Notification::assertSentTo([$interviewer, $hr, $recruiter], InterviewCancelledNotification::class);
    }

    public function test_feedback_submissions_notify_the_scheduler_only(): void
    {
        Notification::fake();
        [$company, , $hr, $recruiter, $interviewer] = $this->team();
        $application = $this->makeApplication($company);

        $interview = app(TenantContext::class)->runAs($company, fn () => app(InterviewService::class)->schedule($application, [
            'type' => 'technical',
            'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
            'duration_minutes' => 60,
            'location' => 'Room 1',
            'participant_ids' => [$interviewer->id, $hr->id],
        ], $recruiter));

        $interview->forceFill(['scheduled_at' => now()->subHour()])->save();

        app(TenantContext::class)->runAs($company, fn () => app(InterviewService::class)->submitFeedback($interview, $interviewer, [
            'technical_score' => 4,
            'communication_score' => 5,
            'problem_solving_score' => 4,
            'overall_rating' => 4,
            'recommendation' => 'hire',
            'comments' => 'Solid fundamentals.',
        ]));

        Notification::assertSentTo($recruiter, FeedbackSubmittedNotification::class);
        Notification::assertNotSentTo($interviewer, FeedbackSubmittedNotification::class);
        Notification::assertNotSentTo($hr, FeedbackSubmittedNotification::class);
    }

    public function test_offer_submission_reaches_approvers_but_not_the_author(): void
    {
        Notification::fake();
        [$company, $admin, $hr, $recruiter] = $this->team();
        $application = $this->makeApplication($company);

        $offer = app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->create($application, [
            'salary_amount' => 50000,
            'currency' => 'USD',
            'contract_type' => 'full_time',
            'start_date' => now()->addMonth()->toDateString(),
            'expires_at' => now()->addWeek()->toIso8601String(),
        ], $recruiter));

        app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->submitForApproval($offer));

        Notification::assertSentTo([$admin, $hr], OfferSubmittedForApprovalNotification::class);
        Notification::assertNotSentTo($recruiter, OfferSubmittedForApprovalNotification::class);
    }

    public function test_accepted_offers_notify_the_author(): void
    {
        Notification::fake();
        [$company, , $hr, $recruiter] = $this->team();
        $application = $this->makeApplication($company);

        $offer = app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->create($application, [
            'salary_amount' => 50000,
            'currency' => 'USD',
            'contract_type' => 'full_time',
            'start_date' => now()->addMonth()->toDateString(),
            'expires_at' => now()->addWeek()->toIso8601String(),
        ], $recruiter));

        app(TenantContext::class)->runAs($company, function () use ($offer, $hr): void {
            app(OfferService::class)->submitForApproval($offer);
            app(OfferService::class)->approve($offer, $hr, 'Within budget');
            app(OfferService::class)->send($offer, $hr);
        });

        $offer->loadMissing('application', 'application.candidate', 'application.jobPosting', 'creator');
        Notification::assertNotSentTo($recruiter, OfferAcceptedNotification::class);

        app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->accept($offer, null, 'Excited to join!', 'public'));

        Notification::assertSentTo($recruiter, OfferAcceptedNotification::class);
    }

    public function test_declined_offers_notify_the_author(): void
    {
        Notification::fake();
        [$company, , $hr, $recruiter] = $this->team();
        $application = $this->makeApplication($company);

        $offer = app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->create($application, [
            'salary_amount' => 50000,
            'currency' => 'USD',
            'contract_type' => 'full_time',
            'start_date' => now()->addMonth()->toDateString(),
            'expires_at' => now()->addWeek()->toIso8601String(),
        ], $recruiter));

        app(TenantContext::class)->runAs($company, function () use ($offer, $hr): void {
            app(OfferService::class)->submitForApproval($offer);
            app(OfferService::class)->approve($offer, $hr, null);
            app(OfferService::class)->send($offer, $hr);
        });

        $offer->loadMissing('application', 'application.candidate', 'application.jobPosting', 'creator');

        app(TenantContext::class)->runAs($company, fn () => app(OfferService::class)->decline($offer, 'Accepted another offer', 'public'));

        Notification::assertSentTo($recruiter, OfferDeclinedNotification::class);
    }

    public function test_reminder_command_notifies_participants_and_candidates_once(): void
    {
        Notification::fake();
        [$company, $admin, , , $interviewer] = $this->team();

        $upcomingApplication = $this->makeApplication($company);
        $farApplication = $this->makeApplication($company);
        $remindedApplication = $this->makeApplication($company);

        $schedule = fn ($application, string $when) => app(TenantContext::class)->runAs(
            $company,
            fn () => app(InterviewService::class)->schedule($application, [
                'type' => 'hr',
                'scheduled_at' => $when,
                'duration_minutes' => 45,
                'location' => 'Room 1',
                'participant_ids' => [$interviewer->id],
            ], $admin),
        );

        $upcomingInterview = $schedule($upcomingApplication, now()->addHours(6)->format('Y-m-d H:i:s'));
        $farInterview = $schedule($farApplication, now()->addDays(3)->format('Y-m-d H:i:s'));
        $remindedInterview = $schedule($remindedApplication, now()->addHours(10)->format('Y-m-d H:i:s'));
        $remindedInterview->forceFill(['reminder_sent_at' => now()])->save();

        $candidateEmail = DB::table('candidates')->where('id', $upcomingApplication->candidate_id)->value('email');

        $this->artisan('interviews:send-reminders')->assertSuccessful();

        Notification::assertSentToTimes($interviewer, InterviewReminderNotification::class, 1);
        Notification::assertSentOnDemand(InterviewReminderNotification::class, function (InterviewReminderNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($candidateEmail): bool {
            return $notifiable->routes['mail'] === $candidateEmail;
        });

        $this->assertDatabaseMissing('interviews', ['id' => $upcomingInterview->id, 'reminder_sent_at' => null]);
        $this->assertDatabaseHas('interviews', ['id' => $farInterview->id, 'reminder_sent_at' => null]);

        // Second run: every interview was already reminded, nothing is sent again.
        $this->artisan('interviews:send-reminders')->assertSuccessful();
        Notification::assertSentToTimes($interviewer, InterviewReminderNotification::class, 1);
    }

    public function test_notification_endpoints_list_mark_and_validate(): void
    {
        // No Notification::fake() here: the endpoints read real database rows.
        [$company, $admin] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);

        $application = $this->makeApplication($company);
        $admin->notifications()->delete(); // reset listener noise

        // The notification payloads read tenant relations: build them inside the tenant.
        app(TenantContext::class)->runAs($company, function () use ($application, $admin, $recruiter): void {
            $application->loadMissing('candidate', 'jobPosting');
            $admin->notify(new ApplicationSubmittedNotification($application));
            $admin->notify(new ApplicationStageChangedNotification(
                $application,
                $application->history()->with('toStage')->firstOrFail(),
            ));
            $recruiter->notify(new ApplicationSubmittedNotification($application));
        });

        Sanctum::actingAs($admin);

        $items = collect($this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 2)
            ->json('data'))
            ->keyBy('type');
        $this->assertCount(2, $items);
        $this->assertSame('New application', $items['application.submitted']['title']);
        $this->assertSame('/applications/'.$application->id, $items['application.submitted']['link']);
        $this->assertSame('Application updated', $items['application.stage_changed']['title']);
        $this->assertNull($items['application.stage_changed']['read_at']);

        $this->getJson('/api/v1/notifications?per_page=1')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/notifications?per_page=0')->assertStatus(422);
        $this->getJson('/api/v1/notifications?unread=yes')->assertStatus(422);

        // Someone else's notification is invisible and not markable.
        $foreignId = $recruiter->notifications()->first()->id;
        $this->postJson("/api/v1/notifications/{$foreignId}/read")->assertNotFound();

        $first = $admin->notifications()->first();
        $response = $this->postJson("/api/v1/notifications/{$first->id}/read")->assertOk();
        $this->assertNotNull($response->json('data.read_at'));

        $this->getJson('/api/v1/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.unread_count', 1);

        $this->postJson('/api/v1/notifications/read-all')->assertOk()->assertJsonPath('data.marked_read', 1);
        $this->getJson('/api/v1/notifications?unread=1')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.unread_count', 0);
    }
}
