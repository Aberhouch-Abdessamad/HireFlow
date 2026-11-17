<?php

namespace Tests;

use App\Enums\ApplicationSource;
use App\Enums\SystemRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Company;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use App\Support\Tenancy\TenantContext;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Seeds roles and permissions (call from tests that use RefreshDatabase). */
    protected function seedRoles(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * Creates a company with a verified Company Admin.
     *
     * @return array{0: Company, 1: User}
     */
    protected function companyWithAdmin(): array
    {
        $company = Company::factory()->create();
        $admin = $this->addMember($company, User::factory()->create(), SystemRole::CompanyAdmin);
        $admin->forceFill(['current_company_id' => $company->id])->save();

        return [$company, $admin];
    }

    /**
     * Creates a job posting for the company (factory state names: 'published', ...).
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function makeJob(Company $company, array $attributes = [], ?string $state = null): JobPosting
    {
        return app(TenantContext::class)->runAs($company, function () use ($attributes, $state): JobPosting {
            $factory = JobPosting::factory();
            if ($state !== null) {
                $factory = $factory->{$state}();
            }

            return $factory->create($attributes);
        });
    }

    /** @param array<string, mixed> $attributes */
    protected function makeCandidate(Company $company, array $attributes = []): Candidate
    {
        return app(TenantContext::class)->runAs($company, fn () => Candidate::factory()->create($attributes));
    }

    /** Creates a candidate with an active application to a published job. */
    protected function makeApplication(Company $company, array $candidateAttributes = []): Application
    {
        $job = $this->makeJob($company, [], 'published');
        $candidate = $this->makeCandidate($company, $candidateAttributes);

        return app(TenantContext::class)->runAs(
            $company,
            fn () => app(ApplicationService::class)->create($candidate, $job, ApplicationSource::Manual, null, null),
        );
    }

    /** Creates an active membership for the user in the company with the given role. */
    protected function addMember(Company $company, User $user, SystemRole $role = SystemRole::Recruiter): User
    {
        $company->users()->attach($user->getKey(), ['status' => 'active', 'joined_at' => now()]);

        app(TenantContext::class)->runAs($company, function () use ($user, $role): void {
            $user->assignRole($role->value);
        });

        $user->unsetRelation('roles');

        return $user;
    }
}
