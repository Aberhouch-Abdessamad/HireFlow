<?php

namespace Tests\Feature\Applications;

use App\Enums\SystemRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PipelineStagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_admin_adds_reorders_and_deletes_custom_stages(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $id = $this->postJson('/api/v1/recruitment-stages', ['name' => 'Culture Interview', 'type' => 'interview', 'position' => 99])
            ->assertCreated()
            ->json('data.id');

        $names = fn () => collect($this->getJson('/api/v1/recruitment-stages')->json('data'))->pluck('name')->all();
        $this->assertSame('Culture Interview', $names()[6], 'Custom stages never move after Hired');
        $this->assertSame('Hired', $names()[7]);

        $this->putJson("/api/v1/recruitment-stages/{$id}", ['name' => 'Culture Fit', 'position' => 1])->assertOk();
        $this->assertSame(['Applied', 'Culture Fit'], array_slice($names(), 0, 2), 'Applied always stays first');

        $this->deleteJson("/api/v1/recruitment-stages/{$id}")->assertNoContent();
        $this->assertCount(7, $names());
    }

    public function test_system_stages_are_protected(): void
    {
        [, $admin] = $this->companyWithAdmin();
        Sanctum::actingAs($admin);

        $stages = collect($this->getJson('/api/v1/recruitment-stages')->json('data'));
        $hired = $stages->firstWhere('type', 'hired');

        $this->deleteJson("/api/v1/recruitment-stages/{$hired['id']}")->assertUnprocessable()->assertJsonPath('code', 'SYSTEM_STAGE');
        $this->postJson('/api/v1/recruitment-stages', ['name' => 'Hired 2', 'type' => 'hired', 'position' => 3])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_recruiters_cannot_change_the_pipeline(): void
    {
        [$company] = $this->companyWithAdmin();
        $recruiter = $this->addMember($company, User::factory()->create(), SystemRole::Recruiter);
        Sanctum::actingAs($recruiter);

        $this->getJson('/api/v1/recruitment-stages')->assertOk();
        $this->postJson('/api/v1/recruitment-stages', ['name' => 'X stage', 'type' => 'interview', 'position' => 2])->assertForbidden();
    }
}
