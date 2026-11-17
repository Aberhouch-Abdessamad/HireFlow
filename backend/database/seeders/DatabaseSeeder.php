<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Reference data always; demo data only outside production.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
