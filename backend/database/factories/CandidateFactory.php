<?php

namespace Database\Factories;

use App\Models\Candidate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Fictitious people only (example.test addresses). Create inside a tenant context.
 *
 * @extends Factory<Candidate>
 */
class CandidateFactory extends Factory
{
    public function definition(): array
    {
        $first = fake()->firstName();
        $last = fake()->lastName();

        return [
            'first_name' => $first,
            'last_name' => $last,
            'email' => strtolower($first.'.'.$last.fake()->unique()->numberBetween(1, 99999)).'@example.test',
            'phone' => fake()->numerify('+212 6## ### ###'),
            'location' => fake()->city(),
            'headline' => fake()->jobTitle(),
            'source' => 'manual',
        ];
    }
}
