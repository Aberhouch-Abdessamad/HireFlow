<?php

namespace Tests\Feature\Candidates;

use App\Enums\SystemRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CandidateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_recruiter_creates_a_full_candidate_profile(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->postJson('/api/v1/candidates', [
            'first_name' => 'Lina',
            'last_name' => 'Haddad',
            'email' => 'Lina.Haddad@Example.test',
            'phone' => '+212 600-000-111',
            'headline' => 'Full-stack developer',
            'linkedin_url' => 'https://www.linkedin.com/in/lina-example',
            'skills' => ['Laravel', 'React'],
            'tags' => ['Top talent'],
            'experiences' => [['company_name' => 'Example Corp', 'title' => 'Developer', 'start_date' => '2021-01-01', 'is_current' => true]],
            'educations' => [['institution' => 'Example University', 'degree' => 'MSc', 'start_date' => '2016-09-01', 'end_date' => '2018-06-30']],
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'lina.haddad@example.test')
            ->assertJsonPath('data.skills', ['Laravel', 'React'])
            ->assertJsonPath('data.tags', ['Top talent'])
            ->assertJsonCount(1, 'data.experiences')
            ->assertJsonCount(1, 'data.educations');

        $this->assertDatabaseHas('candidates', ['company_id' => $company->id, 'phone_normalized' => '212600000111']);
    }

    public function test_duplicate_email_is_rejected_and_detection_finds_matches(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $existing = $this->makeCandidate($company, ['email' => 'dup@example.test', 'phone' => '+212 611 222 333', 'first_name' => 'Omar', 'last_name' => 'Idrissi']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/candidates', ['first_name' => 'X', 'last_name' => 'Y', 'email' => 'DUP@example.test'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'DUPLICATE_CANDIDATE');

        $this->getJson('/api/v1/candidates/duplicates?phone=00212611222333')->assertJsonPath('data.0.id', $existing->id);
        $this->getJson('/api/v1/candidates/duplicates?first_name=Omar&last_name=Idrissi')->assertJsonPath('data.0.id', $existing->id);
        $this->getJson('/api/v1/candidates/duplicates?email=dup@example.test&ignore_id='.$existing->id)->assertJsonCount(0, 'data');
    }

    public function test_same_email_in_another_company_is_a_separate_candidate(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        $foreign = $this->makeCandidate($companyB, ['email' => 'shared@example.test']);
        Sanctum::actingAs($adminA);

        $this->postJson('/api/v1/candidates', ['first_name' => 'A', 'last_name' => 'B', 'email' => 'shared@example.test'])->assertCreated();
        $this->getJson('/api/v1/candidates/'.$foreign->id)->assertNotFound();
        $this->getJson('/api/v1/candidates/duplicates?email=shared@example.test')->assertJsonCount(1, 'data');
    }

    public function test_search_filters_and_notes(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $this->makeCandidate($company, ['first_name' => 'Yasmine', 'headline' => 'Data scientist']);
        $other = $this->makeCandidate($company, ['first_name' => 'Karim']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/candidates?search=data')->assertJsonCount(1, 'data')->assertJsonPath('data.0.first_name', 'Yasmine');

        $this->postJson("/api/v1/candidates/{$other->id}/notes", ['body' => 'Strong communicator'])->assertCreated();
        $this->getJson("/api/v1/candidates/{$other->id}/notes")->assertJsonPath('data.0.body', 'Strong communicator');
    }

    public function test_interviewers_cannot_browse_the_talent_pool(): void
    {
        [$company] = $this->companyWithAdmin();
        $interviewer = $this->addMember($company, User::factory()->create(), SystemRole::Interviewer);
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($interviewer);

        $this->getJson('/api/v1/candidates')->assertForbidden();
        $this->getJson('/api/v1/candidates/'.$candidate->id)->assertForbidden();
    }

    public function test_only_permitted_roles_can_delete(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        $candidate = $this->makeCandidate($company);

        Sanctum::actingAs($recruiter);
        $this->deleteJson('/api/v1/candidates/'.$candidate->id)->assertForbidden();

        Sanctum::actingAs($admin);
        $this->deleteJson('/api/v1/candidates/'.$candidate->id)->assertNoContent();
        $this->assertSoftDeleted('candidates', ['id' => $candidate->id]);
    }
}
