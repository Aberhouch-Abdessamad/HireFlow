# Phase 1 Report: Foundation

## 1. What was implemented

**Frontend (verified: typecheck, lint, 18 tests and production build all pass)**

- Vite + React 19 + strict TypeScript project with ESLint, Prettier and Vitest.
- Ant Design 6 theme built from the HireFlow palette and the Inter font. Tailwind 4 is used without Preflight, and antd styles load in an earlier CSS layer than Tailwind's utilities.
- Central Axios client for Sanctum SPA cookies: CSRF bootstrap, a single retry after a 419, a 401 hook, and errors normalised into `ApiError`. 5xx details are never shown.
- TanStack Query client: retries only network errors and 5xx.
- Router; AppLayout (collapsible sidebar, permission-filtered navigation), AuthLayout and PublicLayout; ProtectedRoute, RequirePermission and `<Can>`.
- Shared UI: EmptyState, ErrorState, LoadingSkeleton, PageHeader.
- `/status` page: live API health and CSRF handshake, used as the environment smoke test.

**Backend (written; the tests could not be run in Claude's environment, see §8)**

- Laravel 13.9 skeleton with only the API kept (frontend assets and welcome view removed).
- Packages: Sanctum (SPA), Fortify (headless; auth routes under `/api/v1/auth`), Spatie Permission in **teams mode** (`company_id`), l5-swagger.
- Bootstrap: `/api/v1` routes, `statefulApi()`, API throttling, `ForceJsonResponse`, no guest redirects, and a single JSON error contract (`ApiExceptionRenderer`).
- Tenancy core: `TenantContext` (a scoped binding), `BelongsToCompany` + `CompanyScope` (fills in `company_id`, rejects cross-tenant writes, returns no rows when no tenant is set), and `ResolveTenant` (active company resolved only from server-side membership, Spatie team set per request).
- `EnsureUserIsActive`: ends the sessions of deactivated accounts.
- Fortify: login rejects deactivated users with the same generic error (no account enumeration), login and 2FA rate limits, and password-reset links that point to the SPA.
- Enums: `PermissionName` (the catalogue), `SystemRole` (default permissions per role), `MembershipStatus`.
- Super Admin role assigned in the platform scope (team `0`), so a company can't grant it. `Gate::before` gives it platform access.
- `RolesAndPermissionsSeeder` (safe to re-run).
- `GET /api/v1/health` with an OpenAPI description.

## 2. Files created

- **Root:** `.gitignore`, `.editorconfig`, `.gitattributes`, `README.md`, `scripts/dev.ps1`, `ci-workflows/frontend.yml`, `ci-workflows/backend.yml`
- **Docs:** `ARCHITECTURE.md`, `CHECKLIST.md`, `PHASE_1_PLAN.md`, `PHASE_1_REPORT.md`, `SETUP.md`
- **Frontend:** config files (`package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.env.example`, `index.html`), plus `src/` (app, layouts, components, features/auth, features/system, services, stores, hooks, types, test)
- **Backend (app):**
  - `Enums/{PermissionName,SystemRole,MembershipStatus}`
  - `Exceptions/{ApiException,ApiExceptionRenderer,NoActiveCompanyException,AccountDeactivatedException,TenantNotResolvedException,CrossTenantWriteException}`
  - `Http/Middleware/{ForceJsonResponse,EnsureUserIsActive,ResolveTenant}`
  - `Http/Controllers/Api/V1/{HealthController,OpenApiSpec}`
  - `Models/{Company,Membership}`, `Models/Concerns/BelongsToCompany`, `Models/Scopes/CompanyScope`
  - `Support/Tenancy/TenantContext`
  - `Actions/Fortify/*`, `Providers/FortifyServiceProvider`
- **Backend (other):**
  - Config: `fortify.php`, `permission.php`, `sanctum.php`, `l5-swagger.php`
  - Migrations: companies, company_user, users.current_company_id, Fortify 2FA columns, permission tables
  - `CompanyFactory`, `RolesAndPermissionsSeeder`
  - Tests: `Feature/System/HealthCheckTest`, `Feature/Auth/LoginTest`, `Feature/Tenancy/{ResolveTenantTest,BelongsToCompanyTest}`, `Unit/Enums/SystemRoleTest`

## 3. Files modified (from the Laravel skeleton)

`composer.json`, `bootstrap/app.php`, `bootstrap/providers.php`, `config/app.php` (`frontend_url`), `.env.example`, `routes/web.php`, `routes/api.php`, `app/Models/User.php`, `app/Providers/AppServiceProvider.php`, `database/factories/UserFactory.php`, the users migration (`is_active`, `last_login_at`), `DatabaseSeeder.php`, `tests/TestCase.php`, `README.md`.

## 4. Database changes

| Table | Change |
|---|---|
| `users` | adds `is_active`, `last_login_at`, `current_company_id` (FK, null on delete), and the Fortify 2FA columns |
| `companies` | new: name, unique slug, profile fields, `settings` JSON, `is_active`, soft deletes |
| `company_user` | new: memberships with `status`, `job_title`, `invited_by`, `joined_at`; unique `(company_id, user_id)` |
| Spatie tables | `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`, with the `company_id` team column |
| Laravel defaults | `sessions`, `password_reset_tokens`, `cache`, `jobs`, `job_batches`, `failed_jobs` |

## 5. API endpoints

- `GET /api/v1/health`
- `GET /sanctum/csrf-cookie`
- **Fortify, under `/api/v1/auth`:**
  - `POST login`, `POST logout`
  - `POST forgot-password`, `POST reset-password`
  - `PUT user/password`
  - `POST two-factor-challenge`
  - 2FA enable / confirm / disable / QR code / recovery codes, and password confirmation
- `GET /api/documentation` (Swagger UI)

## 6. Security considerations

- The tenant is never read from client input. Reads return no rows when no tenant is set. `company_id` can't be mass-assigned, and records can't be moved between companies.
- Roles are per company (Spatie teams). Super Admin is platform-scoped and can't be granted by a company.
- Sessions use HttpOnly cookies and CSRF tokens. Nothing auth-related is stored in browser storage.
- Login is rate-limited (per email+IP and per IP). Deactivated accounts can't log in and lose existing sessions.
- Errors never expose stack traces, SQL, model names or policy messages outside debug mode.
- `Model::shouldBeStrict()` outside production. Password policy: 10+ characters, mixed case, numbers; checked against breached-password lists in production.

## 7. Remaining work (Phase 2)

Company registration, `/auth/me`, email verification, company switching, members and invitations, the auth pages, wiring the protected app shell, and demo seed data.

## 8. Known issues and limits

- **The backend tests have not been run yet.** Claude's environment can reach GitHub (the Laravel skeleton and the package sources used as references came from there), but not `repo.packagist.org`. That means `composer install` couldn't run. Every PHP file passes `php -l`, and package APIs were checked against the package sources (Laravel 13.42, Fortify 1.42, Spatie Permission 8.5, Sanctum 4.4, l5-swagger 11.4). The first `php artisan test` on your machine is the real check.
- There is no `composer.lock` yet. It is created by your first `composer install` and should be committed.
- The CI workflows are in `ci-workflows/` because Claude's tools can't write to `.github/`.
- The frontend bundle is about 900 KB. Route-level code splitting comes with Phase 2 pages.
