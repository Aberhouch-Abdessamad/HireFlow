<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'website' => fake()->url(),
            'industry' => fake()->randomElement(['Software', 'Finance', 'Healthcare', 'Retail', 'Logistics']),
            'size' => fake()->randomElement(['1-10', '11-50', '51-200', '201-500', '500+']),
            'country' => fake()->countryCode(),
            'timezone' => 'UTC',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
