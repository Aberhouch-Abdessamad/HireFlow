<?php

namespace Tests\Feature\Company;

use App\Enums\SystemRole;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\CompanyInvitationNotification;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvitationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Notification::fake();
    }

    /** Invites through the API and returns the plain token captured from the notification. */
    private function inviteAndCaptureToken(User $admin, string $email, string $role = 'recruiter'): string
    {
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/company/invitations', ['email' => $email, 'role' => $role])->assertCreated();

        $token = null;
        Notification::assertSentOnDemand(
            CompanyInvitationNotification::class,
            function (CompanyInvitationNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($email, &$token): bool {
                if (($notifiable->routes['mail'] ?? null) !== $email) {
                    return false;
                }
                $token = basename($notification->toMail($notifiable)->actionUrl);

                return true;
            },
        );

        $this->app['auth']->forgetGuards();

        return (string) $token;
    }

    public function test_admin_invites_and_new_user_accepts(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $token = $this->inviteAndCaptureToken($admin, 'new.hire@example.test');

        $this->assertDatabaseMissing('invitations', ['token_hash' => $token]);

        $this->getJson('/api/v1/invitations/'.$token)
            ->assertOk()
            ->assertJsonPath('data.company.name', $company->name)
            ->assertJsonPath('data.account_exists', false);

        $this->withHeader('Referer', 'http://localhost')
            ->postJson('/api/v1/invitations/'.$token.'/accept', [
                'name' => 'New Hire',
                'password' => 'Str0ngPassword!',
                'password_confirmation' => 'Str0ngPassword!',
            ])->assertOk();

        $user = User::where('email', 'new.hire@example.test')->firstOrFail();
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame($company->id, $user->current_company_id);
        $this->assertAuthenticatedAs($user, 'web');

        setPermissionsTeamId($company->id);
        $this->assertTrue($user->fresh()->hasRole(SystemRole::Recruiter->value));

        $this->getJson('/api/v1/invitations/'.$token)->assertNotFound();
    }

    public function test_existing_account_must_sign_in_to_accept(): void
    {
        [, $admin] = $this->companyWithAdmin();
        $existing = User::factory()->create(['email' => 'pro@example.test']);
        $token = $this->inviteAndCaptureToken($admin, 'pro@example.test', 'interviewer');

        $this->postJson('/api/v1/invitations/'.$token.'/accept')
            ->assertStatus(409)
            ->assertJsonPath('code', 'LOGIN_REQUIRED');

        $this->actingAs($existing, 'web')
            ->postJson('/api/v1/invitations/'.$token.'/accept')
            ->assertOk();
    }

    public function test_revoked_invitations_cannot_be_accepted(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $token = $this->inviteAndCaptureToken($admin, 'late@example.test');

        $invitation = app(TenantContext::class)->runAs($company, fn () => Invitation::firstOrFail());
        Sanctum::actingAs($admin);
        $this->deleteJson('/api/v1/company/invitations/'.$invitation->id)->assertNoContent();

        $this->getJson('/api/v1/invitations/'.$token)->assertNotFound();
    }

    public function test_cannot_revoke_another_companys_invitation(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [, $adminB] = $this->companyWithAdmin();
        $this->inviteAndCaptureToken($adminA, 'someone@example.test');
        $invitation = app(TenantContext::class)->runAs($companyA, fn () => Invitation::firstOrFail());

        Sanctum::actingAs($adminB);
        $this->deleteJson('/api/v1/company/invitations/'.$invitation->id)->assertNotFound();
    }

    public function test_existing_members_cannot_be_invited_again(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/company/invitations', ['email' => $admin->email, 'role' => 'recruiter'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'ALREADY_MEMBER');
    }

    public function test_recruiters_cannot_invite(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->postJson('/api/v1/company/invitations', ['email' => 'x@example.test', 'role' => 'recruiter'])
            ->assertForbidden();
    }
}
