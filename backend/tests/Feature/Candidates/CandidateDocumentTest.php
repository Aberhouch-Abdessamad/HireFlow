<?php

namespace Tests\Feature\Candidates;

use App\Models\CandidateDocument;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CandidateDocumentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Storage::fake(CandidateDocument::DISK);
    }

    public function test_cv_is_stored_privately_and_downloaded_through_the_api(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($admin);

        $response = $this->post("/api/v1/candidates/{$candidate->id}/documents", [
            'file' => UploadedFile::fake()->create('My CV (2026).pdf', 120, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $response->assertJsonMissingPath('data.path')->assertJsonPath('data.original_name', 'My CV 2026.pdf');

        $document = app(TenantContext::class)->runAs($company, fn () => CandidateDocument::firstOrFail());
        Storage::disk(CandidateDocument::DISK)->assertExists($document->path);
        $this->assertStringStartsWith("candidates/{$company->id}/{$candidate->id}/", $document->path);

        $this->get($response->json('data.download_url'))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertDownload('My CV 2026.pdf');
    }

    public function test_rejects_executables_and_oversized_files(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $candidate = $this->makeCandidate($company);
        Sanctum::actingAs($admin);

        $this->post("/api/v1/candidates/{$candidate->id}/documents", [
            'file' => UploadedFile::fake()->create('cv.php', 10, 'application/x-php'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->post("/api/v1/candidates/{$candidate->id}/documents", [
            'file' => UploadedFile::fake()->create('cv.pdf', 6000, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_other_companies_cannot_download_documents(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [, $adminB] = $this->companyWithAdmin();
        $candidate = $this->makeCandidate($companyA);

        Sanctum::actingAs($adminA);
        $url = $this->post("/api/v1/candidates/{$candidate->id}/documents", [
            'file' => UploadedFile::fake()->create('cv.pdf', 50, 'application/pdf'),
        ], ['Accept' => 'application/json'])->json('data.download_url');

        Sanctum::actingAs($adminB);
        $this->getJson($url)->assertNotFound();
    }

    public function test_document_must_belong_to_the_candidate_in_the_url(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        $owner = $this->makeCandidate($company);
        $other = $this->makeCandidate($company);
        Sanctum::actingAs($admin);

        $id = $this->post("/api/v1/candidates/{$owner->id}/documents", [
            'file' => UploadedFile::fake()->create('cv.pdf', 50, 'application/pdf'),
        ], ['Accept' => 'application/json'])->json('data.id');

        $this->getJson("/api/v1/candidates/{$other->id}/documents/{$id}/download")->assertNotFound();
    }
}
