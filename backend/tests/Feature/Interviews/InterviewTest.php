<?php

namespace Tests\Feature\Interviews;

use App\Enums\SystemRole;
use App\Models\CandidateDocument;
use App\Models\Interview;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InterviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    /** @return array<string, mixed> */
    private function payload(int $applicationId, array $participants, array $overrides = []): array
    {
        return array_merge([
            'application_id' => $applicationId,
            'type' => 'technical',
            'scheduled_at' => now()->addDays(2)->setTime(10, 0)->toIso8601String(),
            'duration_minutes' => 60,
            'meeting_url' => 'https://meet.example.test/abc',
            'participant_ids' => $participants,
        ], $overrides);
    }

    public function test_recruiter_schedules_and_conflicts_are_detected(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $first = $this->makeApplication($company);
        $second = $this->makeApplication($company);
        Sanctum::actingAs($recruiter);

        $this->postJson('/api/v1/interviews', $this->payload($first->id, [$interviewer->id]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.participants.0.id', $interviewer->id);

        $overlapping = $this->payload($second->id, [$interviewer->id], [
            'scheduled_at' => now()->addDays(2)->setTime(10, 30)->toIso8601String(),
        ]);
        $this->postJson('/api/v1/interviews', $overlapping)->assertStatus(409)->assertJsonPath('code', 'SCHEDULE_CONFLICT');
        $this->postJson('/api/v1/interviews', [...$overlapping, 'force' => true])->assertCreated();
    }

    public function test_validation_of_time_place_and_participants(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        [, $foreign] = $this->companyWithAdmin();
        $application = $this->makeApplication($company);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/interviews', $this->payload($application->id, [$foreign->id], [
            'scheduled_at' => now()->subHour()->toIso8601String(),
            'meeting_url' => null,
        ]))->assertUnprocessable()->assertJsonValidationErrors(['scheduled_at', 'meeting_url', 'participant_ids.0']);
    }

    public function test_interviewers_only_see_their_own_interviews_and_the_candidate_cv(): void
    {
        Storage::fake(CandidateDocument::DISK);
        [$company, $admin] = $this->companyWithAdmin();
        $alice = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $bob = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $application = $this->makeApplication($company);

        Sanctum::actingAs($admin);
        $this->post("/api/v1/candidates/{$application->candidate_id}/documents", [
            'file' => UploadedFile::fake()->create('cv.pdf', 50, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $id = $this->postJson('/api/v1/interviews', $this->payload($application->id, [$alice->id]))->json('data.id');

        Sanctum::actingAs($bob);
        $this->getJson('/api/v1/interviews')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/interviews/{$id}")->assertForbidden();

        Sanctum::actingAs($alice);
        $this->getJson('/api/v1/interviews')->assertJsonCount(1, 'data');
        $interview = $this->getJson("/api/v1/interviews/{$id}")->assertOk();
        $this->get($interview->json('data.application.documents.0.download_url'))->assertOk();
        $this->getJson("/api/v1/candidates/{$application->candidate_id}")->assertForbidden();
    }

    public function test_feedback_is_blind_until_submitted_and_completes_the_interview(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $alice = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $bob = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $application = $this->makeApplication($company);

        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/interviews', $this->payload($application->id, [$alice->id, $bob->id]))->json('data.id');
        app(TenantContext::class)->runAs($company, fn () => Interview::findOrFail($id)->forceFill(['scheduled_at' => now()->subHour()])->saveQuietly());

        $feedback = [
            'technical_score' => 4, 'communication_score' => 5, 'problem_solving_score' => 4,
            'overall_rating' => 4, 'recommendation' => 'hire', 'comments' => 'Solid.',
        ];

        Sanctum::actingAs($alice);
        $this->postJson("/api/v1/interviews/{$id}/feedback", $feedback)->assertCreated();

        Sanctum::actingAs($bob);
        $this->getJson("/api/v1/interviews/{$id}/feedback")
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.can_see_all', false);
        $this->postJson("/api/v1/interviews/{$id}/feedback", [...$feedback, 'overall_rating' => 9])->assertUnprocessable();
        $this->postJson("/api/v1/interviews/{$id}/feedback", [...$feedback, 'recommendation' => 'no_hire'])->assertCreated();
        $this->getJson("/api/v1/interviews/{$id}/feedback")->assertJsonCount(2, 'data');

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/interviews/{$id}")->assertJsonPath('data.status', 'completed');
    }

    public function test_non_participants_cannot_submit_feedback_and_early_feedback_is_rejected(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $alice = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $outsider = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $application = $this->makeApplication($company);
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/interviews', $this->payload($application->id, [$alice->id]))->json('data.id');
        $feedback = ['technical_score' => 3, 'communication_score' => 3, 'problem_solving_score' => 3, 'overall_rating' => 3, 'recommendation' => 'hire'];

        Sanctum::actingAs($outsider);
        $this->postJson("/api/v1/interviews/{$id}/feedback", $feedback)->assertForbidden();

        Sanctum::actingAs($alice);
        $this->postJson("/api/v1/interviews/{$id}/feedback", $feedback)->assertStatus(409)->assertJsonPath('code', 'FEEDBACK_TOO_EARLY');
    }

    public function test_reschedule_and_cancel(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $application = $this->makeApplication($company);
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/interviews', $this->payload($application->id, [$admin->id]))->json('data.id');

        $newTime = now()->addDays(5)->setTime(15, 0)->utc();
        $this->putJson("/api/v1/interviews/{$id}", ['scheduled_at' => $newTime->toIso8601String()])
            ->assertOk()
            ->assertJsonPath('data.scheduled_at', $newTime->toIso8601String());
        $this->assertDatabaseHas('audit_logs', ['event' => 'interview.rescheduled']);

        $this->postJson("/api/v1/interviews/{$id}/cancel", ['reason' => 'Candidate unavailable'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->putJson("/api/v1/interviews/{$id}", ['duration_minutes' => 30])->assertStatus(409);
    }
}
