<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Grants the platform Super Admin role to an existing account:
 *
 *   php artisan hireflow:super-admin you@example.com
 */
class MakeSuperAdmin extends Command
{
    protected $signature = 'hireflow:super-admin {email : Email of an existing user}';

    protected $description = 'Give an existing user the platform Super Admin role';

    public function handle(): int
    {
        $user = User::query()->where('email', mb_strtolower(trim((string) $this->argument('email'))))->first();

        if ($user === null) {
            $this->error('No user with that email. Register the account first, then run this again.');

            return self::FAILURE;
        }

        if ($user->isSuperAdmin()) {
            $this->info("{$user->email} is already a Super Admin.");

            return self::SUCCESS;
        }

        $user->grantSuperAdmin();
        $this->info("{$user->email} is now a Super Admin.");

        return self::SUCCESS;
    }
}
