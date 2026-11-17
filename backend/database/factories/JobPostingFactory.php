<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkMode;
use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Create inside a tenant context (TenantContext::runAs) so company_id is filled.
 *
 * @extends Factory<JobPosting>
 */
class JobPostingFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->randomElement([
            'Senior Backend Engineer', 'Frontend Developer', 'Product Designer', 'Data Analyst',
            'DevOps Engineer', 'QA Engineer', 'Account Executive', 'HR Business Partner',
        ]);
        $min = fake()->numberBetween(30, 80) * 1000;

        return [
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'title' => $title,
            'description' => fake()->paragraphs(3, true),
            'requirements' => fake()->paragraphs(2, true),
            'location' => fake()->city(),
            'work_mode' => fake()->randomElement(WorkMode::cases()),
            'employment_type' => fake()->randomElement(EmploymentType::cases()),
            'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
            'salary_min' => $min,
            'salary_max' => $min + 20000,
            'salary_currency' => 'EUR',
            'salary_visible' => true,
            'status' => JobStatus::Draft,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => JobStatus::Published,
            'published_at' => now()->subDays(3),
            'expires_at' => now()->addDays(30),
        ]);
    }
}
