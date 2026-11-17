<?php

namespace Tests\Feature\Jobs;

use App\Enums\SystemRole;
use App\Models\Department;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DepartmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_admin_manages_departments_with_unique_names_per_company(): void
    {
        [$companyA, $adminA] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        app(TenantContext::class)->runAs($companyB, fn () => Department::create(['name' => 'Engineering']));
        Sanctum::actingAs($adminA);

        // Same name as another company's department is fine.
        $id = $this->postJson('/api/v1/departments', ['name' => 'Engineering'])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/departments', ['name' => 'Engineering'])->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->putJson("/api/v1/departments/{$id}", ['name' => 'Platform Engineering'])->assertOk();
        $this->getJson('/api/v1/departments')->assertOk()->assertJsonCount(1, 'data');

        $job = $this->makeJob($companyA);
        $job->forceFill(['department_id' => $id])->saveQuietly();

        $this->deleteJson("/api/v1/departments/{$id}")->assertNoContent();
        $this->assertNull($job->fresh()->department_id);
    }

    public function test_recruiters_can_read_but_not_manage_departments(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->getJson('/api/v1/departments')->assertOk();
        $this->postJson('/api/v1/departments', ['name' => 'Sales'])->assertForbidden();
    }

    public function test_other_companies_departments_return_404(): void
    {
        [, $adminA] = $this->companyWithAdmin();
        [$companyB] = $this->companyWithAdmin();
        $foreign = app(TenantContext::class)->runAs($companyB, fn () => Department::create(['name' => 'Finance']));
        Sanctum::actingAs($adminA);

        $this->putJson("/api/v1/departments/{$foreign->id}", ['name' => 'Mine now'])->assertNotFound();
        $this->deleteJson("/api/v1/departments/{$foreign->id}")->assertNotFound();
    }
}
