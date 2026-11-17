<?php

namespace Tests\Feature\Company;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyLogoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Storage::fake('public');
    }

    public function test_admin_uploads_and_replaces_logo(): void
    {
        [$company, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $this->post('/api/v1/company/logo', ['logo' => UploadedFile::fake()->image('logo.png', 200, 200)], ['Accept' => 'application/json'])
            ->assertOk();
        $first = $company->fresh()->logo_path;
        Storage::disk('public')->assertExists($first);

        $this->post('/api/v1/company/logo', ['logo' => UploadedFile::fake()->image('logo.jpg', 200, 200)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.logo_url', fn (?string $url) => $url !== null);

        Storage::disk('public')->assertMissing($first);
    }

    public function test_svg_and_non_images_are_rejected(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

        $this->post('/api/v1/company/logo', ['logo' => $svg], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('logo');
    }
}
