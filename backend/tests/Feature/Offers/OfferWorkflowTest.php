<?php

namespace Tests\Feature\Offers;

use App\Enums\SystemRole;
use App\Models\Offer;
use App\Models\User;
use App\Notifications\OfferSentNotification;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfferWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Notification::fake();
    }

    /** @return array<string, mixed> */
    private function payload(int $applicationId): array
    {
        return [
            'application_id' => $applicationId,
            'salary_amount' => 65000,
            'currency' => 'EUR',
            'contract_type' => 'full_time',
            'start_date' => now()->addMonth()->toDateString(),
            'expires_at' => now()->addWeek()->toIso8601String(),
            'message' => 'We are thrilled to offer you this role.',
            'internal_notes' => 'Budget approved by finance.',
        ];
    }

    /** Recruiter drafts → HR approves and sends; returns [offerId, token, application]. */
    private function sentOffer(): array
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $hr = $this->addMember($company, User::factory()->create(), SystemRole::HrManager);
        $application = $this->makeApplication($company);

        Sanctum::actingAs($recruiter);
        $id = $this->postJson('/api/v1/offers', $this->payload($application->id))->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->postJson("/api/v1/offers/{$id}/submit")->assertOk()->assertJsonPath('data.status', 'pending_approval');
        $this->postJson("/api/v1/offers/{$id}/approve")->assertForbidden();
        $this->postJson("/api/v1/offers/{$id}/send")->assertForbidden();

        Sanctum::actingAs($hr);
        $this->postJson("/api/v1/offers/{$id}/send")->assertStatus(409)->assertJsonPath('code', 'INVALID_OFFER_TRANSITION');
        $this->postJson("/api/v1/offers/{$id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/v1/offers/{$id}/send")->assertOk()->assertJsonPath('data.status', 'sent');

        $token = null;
        Notification::assertSentOnDemand(OfferSentNotification::class, function (OfferSentNotification $n, array $c, AnonymousNotifiable $notifiable) use (&$token): bool {
            $token = basename($n->toMail($notifiable)->actionUrl);

            return true;
        });

        $this->app['auth']->forgetGuards();

        return [$id, (string) $token, $application, $company];
    }

    public function test_full_offer_flow_ends_with_hired_application(): void
    {
        [$id, $token, $application] = $this->sentOffer();

        $this->getJson("/api/v1/public/offers/{$token}")
            ->assertOk()
            ->assertJsonPath('data.salary_amount', 65000)
            ->assertJsonMissingPath('data.internal_notes');

        $this->postJson("/api/v1/public/offers/{$token}/accept", ['note' => 'Excited to join!'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $application->refresh();
        $this->assertSame('hired', $application->status->value);
        $this->assertNotNull($application->hired_at);
        $this->assertDatabaseHas('application_stage_history', ['application_id' => $application->id, 'to_status' => 'hired']);

        $this->postJson("/api/v1/public/offers/{$token}/decline")->assertStatus(409);
    }

    public function test_sending_moves_the_application_to_the_offer_stage(): void
    {
        [, , $application, $company] = $this->sentOffer();

        $type = app(TenantContext::class)->runAs($company, fn () => $application->fresh()->stage->type->value);
        $this->assertSame('offer', $type);
    }

    public function test_decline_and_expiry(): void
    {
        [$id, $token, $application] = $this->sentOffer();
        $this->postJson("/api/v1/public/offers/{$token}/decline", ['note' => 'Accepted another offer'])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertSame('active', $application->fresh()->status->value);

        [$id2, $token2] = $this->sentOffer();
        Offer::withoutGlobalScopes()->whereKey($id2)->update(['expires_at' => now()->subMinute()]);
        $this->postJson("/api/v1/public/offers/{$token2}/accept")->assertStatus(409)->assertJsonPath('code', 'OFFER_EXPIRED');
        $this->assertSame('expired', Offer::withoutGlobalScopes()->findOrFail($id2)->status->value);
    }

    public function test_only_one_open_offer_per_application_and_self_approval_rule(): void
    {
        [$company] = $this->companyWithAdmin();
        $hr = $this->addMember($company, User::factory()->create(), SystemRole::HrManager);
        $application = $this->makeApplication($company);
        Sanctum::actingAs($hr);

        $id = $this->postJson('/api/v1/offers', $this->payload($application->id))->json('data.id');
        $this->postJson('/api/v1/offers', $this->payload($application->id))->assertStatus(409)->assertJsonPath('code', 'OFFER_EXISTS');

        $this->postJson("/api/v1/offers/{$id}/submit")->assertOk();
        $this->postJson("/api/v1/offers/{$id}/approve")->assertStatus(409)->assertJsonPath('code', 'SELF_APPROVAL');
        $this->postJson("/api/v1/offers/{$id}/return", ['comment' => 'Fix the start date'])->assertOk()->assertJsonPath('data.status', 'draft');
    }

    public function test_offer_validation_and_tenant_isolation(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        [$other, $otherAdmin] = $this->companyWithAdmin();
        $foreignApplication = $this->makeApplication($other);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/offers', [...$this->payload($foreignApplication->id), 'start_date' => now()->subDay()->toDateString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['application_id', 'start_date']);

        Sanctum::actingAs($otherAdmin);
        $offerId = $this->postJson('/api/v1/offers', $this->payload($foreignApplication->id))->json('data.id');

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/offers/{$offerId}")->assertNotFound();
    }

    public function test_invalid_tokens_return_404(): void
    {
        $this->getJson('/api/v1/public/offers/'.str_repeat('x', 64))->assertNotFound();
    }
}
