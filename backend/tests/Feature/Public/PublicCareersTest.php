<?php

namespace Tests\Feature\Public;

use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicCareersTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_published_unexpired_jobs_of_active_companies_are_listed(): void
    {
        $company = Company::factory()->create();
        $inactive = Company::factory()->inactive()->create();

        $visible = $this->makeJob($company, ['title' => 'Visible role'], 'published');
        $this->makeJob($company, ['title' => 'Draft role']);
        $expired = $this->makeJob($company, ['title' => 'Expired role'], 'published');
        $expired->forceFill(['expires_at' => now()->subDay()])->saveQuietly();
        $this->makeJob($inactive, ['title' => 'Inactive company role'], 'published');

        $this->getJson('/api/v1/public/jobs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', $visible->slug)
            ->assertJsonPath('data.0.company.slug', $company->slug);
    }

    public function test_job_page_hides_internal_data_and_hidden_salaries(): void
    {
        $company = Company::factory()->create();
        $job = $this->makeJob($company, ['salary_visible' => false], 'published');

        $response = $this->getJson('/api/v1/public/jobs/'.$job->slug)->assertOk();

        $response->assertJsonPath('data.salary', null)
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.status')
            ->assertJsonMissingPath('data.recruiters')
            ->assertJsonMissingPath('data.created_by')
            ->assertJsonStructure(['data' => ['title', 'description', 'requirements', 'skills', 'company' => ['name', 'slug']]]);
    }

    public function test_unpublished_job_pages_return_404(): void
    {
        $company = Company::factory()->create();
        $draft = $this->makeJob($company);

        $this->getJson('/api/v1/public/jobs/'.$draft->slug)->assertNotFound();
    }

    public function test_public_company_profile_counts_open_jobs(): void
    {
        $company = Company::factory()->create();
        $this->makeJob($company, [], 'published');
        $this->makeJob($company);

        $this->getJson('/api/v1/public/companies/'.$company->slug)
            ->assertOk()
            ->assertJsonPath('data.name', $company->name)
            ->assertJsonPath('data.open_jobs_count', 1)
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.settings');
    }
}
