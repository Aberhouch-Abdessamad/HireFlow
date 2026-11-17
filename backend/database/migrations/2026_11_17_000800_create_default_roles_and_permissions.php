<?php

use App\Enums\PermissionName;
use App\Enums\SystemRole;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creates the permission catalogue and the built-in roles (System reference data the app
 * cannot run without, so it lives in a migration rather than a seeder).
 *
 * Roles are global (company_id = NULL) and assigned per company through Spatie teams.
 * Idempotent: existing permissions/roles are kept and each role's permissions are synced
 * to SystemRole::defaultPermissions(). After changing those definitions, add a new
 * migration that calls the same logic.
 */
return new class extends Migration
{
    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId(null);

        try {
            foreach (PermissionName::cases() as $permission) {
                Permission::findOrCreate($permission->value, 'web');
            }

            foreach (SystemRole::cases() as $systemRole) {
                Role::findOrCreate($systemRole->value, 'web')->syncPermissions(array_map(
                    static fn (PermissionName $permission) => $permission->value,
                    $systemRole->defaultPermissions(),
                ));
            }
        } finally {
            setPermissionsTeamId($previousTeam);
            $registrar->forgetCachedPermissions();
        }
    }

    public function down(): void
    {
        // Rolling back would strip every user's role; the permission tables themselves are
        // dropped by the create_permission_tables migration.
    }
};
