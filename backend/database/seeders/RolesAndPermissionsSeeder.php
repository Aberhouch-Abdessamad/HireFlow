<?php

namespace Database\Seeders;

use App\Enums\PermissionName;
use App\Enums\SystemRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the permission catalogue and the built-in roles.
 *
 * Built-in roles are global (company_id = NULL) and assigned per company via Spatie teams.
 * Safe to run repeatedly: existing permissions and roles are kept, and each role's
 * permissions are synced to the definition in SystemRole.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
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
                $role = Role::findOrCreate($systemRole->value, 'web');
                $role->syncPermissions(array_map(
                    static fn (PermissionName $permission) => $permission->value,
                    $systemRole->defaultPermissions(),
                ));
            }
        } finally {
            setPermissionsTeamId($previousTeam);
            $registrar->forgetCachedPermissions();
        }
    }
}
