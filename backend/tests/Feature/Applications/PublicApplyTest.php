<?php

namespace Tests\Feature\Applications;

use App\Models\Application;
use App\Models\Candidate;
use App\Models\CandidateDocument;
use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicApplyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(CandidateDocument::DISK);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Sara',
            'last_name' => 'Benali',
            'email' => 'sara.benali@example.test',
            'phone' => '+212 612 345 678',
            'cover_letter' => 'I would love to join.',
            'cv' => UploadedFile::fake()->create('sara-cv.pdf', 200, 'application/pdf'),
            'consent' => '1',
        ], $overrides);
    }

    public function test_candidate_applies_with_cv_from_the_careers_page(): void
    {
        $company = Company::factory()->create();
        $job = $this->makeJob($company, [], 'published');

        $this->post("/api/v1/public/jobs/{$job->slug}/apply", $this->payload(), ['Accept' => 'application/json'])
            ->assertCreated();

        $candidate = Candidate::withoutGlobalScope(CompanyScope::class)->where('email', 'sara.benali@example.test')->firstOrFail();
        $this->assertSame($company->id, $candidate->company_id);
        $this->assertSame('careers_page', $candidate->source->value);

        $application = Application::withoutGlobalScope(CompanyScope::class)->where('candidate_id', $candidate->id)->firstOrFail();
        $this->assertSame($job->id, $application->job_posting_id);
        $this->assertSame('I would love to join.', $application->cover_letter);

        $this->assertSame(1, CandidateDocument::withoutGlobalScope(CompanyScope::class)->where('candidate_id', $candidate->id)->count());
    }

    public function test_second_application_to_the_same_job_is_rejected(): void
    {
        $company = Company::factory()->create();
        $job = $this->makeJob($company, [], 'published');

        $this->post("/api/v1/public/jobs/{$job->slug}/apply", $this->payload(), ['Accept' => 'application/json'])->assertCreated();
        $this->post("/api/v1/public/jobs/{$job->slug}/apply", $this->payload(), ['Accept' => 'application/json'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'ALREADY_APPLIED');
    }

    public function test_existing_candidate_is_reused_for_another_job(): void
    {
        $company = Company::factory()->create();
        $first = $this->makeJob($company, [], 'published');
        $second = $this->makeJob($company, [], 'published');

        $this->post("/api/v1/public/jobs/{$first->slug}/apply", $this->payload(), ['Accept' => 'application/json'])->assertCreated();
        $this->post("/api/v1/public/jobs/{$second->slug}/apply", $this->payload(), ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame(1, Candidate::withoutGlobalScope(CompanyScope::class)->count());
        $this->assertSame(2, Application::withoutGlobalScope(CompanyScope::class)->count());
    }

    public function test_drafts_cannot_receive_applications(): void
    {
        $company = Company::factory()->create();
        $draft = $this->makeJob($company);

        $this->post("/api/v1/public/jobs/{$draft->slug}/apply", $this->payload(), ['Accept' => 'application/json'])->assertNotFound();
    }

    public function test_cv_and_consent_are_required_and_validated(): void
    {
        $company = Company::factory()->create();
        $job = $this->makeJob($company, [], 'published');

        $this->post("/api/v1/public/jobs/{$job->slug}/apply", $this->payload([
            'cv' => UploadedFile::fake()->create('cv.exe', 10, 'application/x-msdownload'),
            'consent' => '0',
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cv', 'consent']);
    }

    public function test_honeypot_submissions_are_silently_discarded(): void
    {
        $company = Company::factory()->create();
        $job = $this->makeJob($company, [], 'published');

        $this->post("/api/v1/public/jobs/{$job->slug}/apply", $this->payload(['website' => 'http://spam.example']), ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertSame(0, Candidate::withoutGlobalScope(CompanyScope::class)->count());
    }
}
