# HireFlow Development Checklist

Legend: `[x]` done and verified · `[v]` written, waiting for local verification · `[~]` in progress · `[ ]` not started

## Phase 1: Foundation
- [x] Inspect environment and repository (empty repo; greenfield)
- [x] Architecture, database design, dependencies and risks (`docs/PHASE_1_PLAN.md`)
- [x] Decisions: Laravel 13, native dev environment, offer approval step, Fortify
- [x] Root repository files (`.gitignore`, `.editorconfig`, `.gitattributes`, README, docs)
- [x] Frontend scaffold (Vite 8, React 19, TS 6 strict, ESLint, Prettier, Tailwind 4 without Preflight, antd 6 in a CSS layer)
- [x] Frontend foundations (Axios + CSRF + 419 retry, QueryClient, router, layouts, guards, shared states, `/status` page). 18 tests passing.
- [x] Backend scaffold (Laravel 13.9 skeleton, Sanctum, Fortify, Spatie Permission in teams mode, l5-swagger)
- [x] Backend foundations (API v1 routing, JSON error contract, TenantContext, BelongsToCompany, ResolveTenant, EnsureUserIsActive, enums, permission catalogue, roles seeder, health endpoint, Fortify login with deactivated-user check and rate limits)
- [x] Backend tests: health, JSON errors, CSRF cookie, login, tenant resolution, cross-tenant isolation, per-company roles, Super Admin scope
- [x] CI workflows (frontend, backend) in `.github/workflows/`.
- [x] Local verification: `composer install` → `php artisan test` → `.\scripts\dev.ps1` → `/status` all green
- [x] Phase 1 report (`docs/PHASE_1_REPORT.md`)

## Phase 2: Authentication and Multi-Tenancy
- [x] Company registration (company + admin + role, one transaction, rate-limited)
- [x] `GET /auth/me`, profile update, password reset (no account enumeration); email verification removed
- [x] 2FA UI (enable with QR, confirm, recovery codes, disable, password confirmation)
- [x] Company switching (`POST /company/switch`), `GET /auth/companies`
- [x] Members (list, role change, deactivate/activate, last-admin protection) and invitations (hashed tokens, accept flow)
- [x] Audit log (append-only) for auth, company, member and invitation events
- [x] Frontend: login, register, forgot/reset, verify email, 2FA challenge, protected app shell, company switcher, members, company profile, accept invitation (31 tests passing)
- [x] Demo seed: Super Admin, two companies, users in every role, one shared recruiter
- [x] Local verification: `php artisan test`

## Phase 3: Company and Job Management
- [x] Departments CRUD, skills catalogue, company logo upload
- [x] Job CRUD with tenant-checked department and recruiter ids, skills, salary, expiry
- [x] Job lifecycle (publish, pause, close, reopen, archive) with audit and the auto-expiry scheduler
- [x] Public careers API (published, unexpired jobs from active companies; reduced public resource)
- [x] Frontend: jobs list/detail/create/edit, departments, logo upload, public careers pages (39 tests passing)
- [x] Local verification: `php artisan test`

## Phase 4: Candidates and Applications
- [x] Configurable pipeline stages (defaults per company, add/rename/reorder/delete with rules)
- [x] Candidate profiles (experience, education, skills, tags, notes), search, duplicate detection
- [x] Private CV storage with authorized, audited downloads
- [x] Applications: duplicate prevention, stage transitions with history (transaction + lock), reject/reopen, assignment, comments
- [x] Public apply endpoint (rate-limited, honeypot, consent)
- [x] Frontend: candidates, applications, pipeline board (drag and drop + accessible menu), stage settings, careers Apply form (47 tests passing)
- [x] Candidate portal (delivered in Phase 5)
- [x] Local verification: `php artisan test`

## Phase 5: Interviews and Offers
- [x] Interview scheduling with conflict detection, reschedule, cancel, complete
- [x] Interviewer-only visibility, CV access through the interview, blind feedback
- [x] Offers with an approval step (four-eyes rule), email with a hashed response link, expiry scheduler
- [x] Hiring only through an accepted offer (same transaction)
- [x] Candidate portal (registration with immediate profile linking, applications, interviews, offers, profile, documents)
- [x] Frontend: interviews list/calendar/detail/feedback, scheduling, offers, public offer response, candidate portal (54 tests passing)
- [x] Local verification: `php artisan test`

## Phase 6: Dashboard and Notifications
- [x] Company dashboard overview with computed KPIs (active jobs, candidates, applications, interviews, hires, rejection/conversion rates, average time to hire) for company-scoped data
- [x] Date-range presets (today, 7/30/90, custom range) with validation on `GET /dashboard/overview`
- [x] Analytics: applications per month (zero-filled), hiring funnel (cumulative by stage type + current stage distribution + status split), jobs by department/status, recruiter performance, time to hire (overall, per month, per department)
- [x] Shared `DateRangeRequest` for dashboard and analytics endpoints, with company/admin permission gating (interviewers forbidden)
- [x] In-app notifications feed (`GET/POST /notifications`, mark single/all read) via the database channel, with flat payload shape
- [x] Notification listeners for application submitted/stage changed/rejected, interview scheduled/rescheduled/cancelled/completed, offer submitted/approved/sent/accepted/declined/expired, feedback submitted
- [x] Email notifications for offer submitted/approved/sent and interview reminders
- [x] Interview reminder scheduler (`interviews:send-reminders`, hourly, idempotent via `reminder_sent_at`) for staff (in-app + email) and candidate (email)
- [x] Queue support: reminder mail and offer mail use `ShouldQueue`; queue jobs remain in the jobs table with database queue driver
- [x] Floats such as rates and days returned with `JSON_PRESERVE_ZERO_FRACTION` so `0.0`/`10.0` survive as floats
- [x] Frontend: dashboard KPIs, analytics tabs/charts, notifications bell, routes and navigation (53 tests passing)
- [x] Local verification: `php artisan test` -> 142 tests, 142 passed, 706 assertions
- [x] Phase 6 report (`docs/PHASE_6_REPORT.md`)
## Phase 7: Testing and Security
- [x] Playwright E2E scaffold (`frontend/playwright.config.ts`, `frontend/e2e/smoke.spec.ts`)
- [x] Security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) applied globally
- [~] E2E coverage for auth, dashboard, and analytics; recruitment and candidate portal flows still to expand
- [x] Dependency audit (backend + frontend) — no advisories
- [x] Security headers (CSP, HSTS, frame/referrer/permissions policy)
- [~] Security review: OWASP checklist and rate-limit tuning still pending
## Phase 8: Deployment and Documentation
- [x] Dockerfiles for backend (PHP 8.4/Apache) and frontend (Vite build + Nginx)
- [x] `docker-compose.yml` with MySQL, backend, queue worker, frontend
- [x] Deployment architecture doc (`docs/DEPLOYMENT.md`)
- [x] OpenAPI base annotation (`backend/app/OpenApi.php`, L5-Swagger spec generated)
- [~] Production hardening documented (TLS, secrets, backups, monitoring, CSP)

## Local verification log — Phases 1–5 (2026-11-17)

Windows local run (PHP 8.4 at `C:\php84`, XAMPP MariaDB, `mail` mailer = `log`): `php artisan test` → **127 tests, 127 passed, 578 assertions**; `php artisan serve` + `/status` green. The first full run failed 82 tests; every failure was traced to a root cause and fixed in the app, not in the tests:

**Application fixes**
- `User` model: added the missing `HasApiTokens` trait (`Sanctum::actingAs` calls `withAccessToken()`), and model-level defaults for `is_active`, `current_company_id`, `two_factor_confirmed_at`, `last_login_at` — with `Model::shouldBeStrict()` a factory-created user that never loaded those columns throws `MissingAttributeException` once Sanctum flips `wasRecentlyCreated` to false. The defaults mirror the DB defaults.
- `Candidate` model: same treatment for `source` (`'manual'` — POST /candidates rendered the response before the DB default applied) and `normalizePhone()` now strips a leading `00` international dialing prefix, so duplicate detection matches `002126…` against a stored `+212…` number.
- `AuthUserResource::withResponse()` pins status 200: Laravel's `ResourceResponse` answers 201 when the wrapped model is `wasRecentlyCreated`, which leaked into `GET /auth/me` right after registration within one PHP process.
- `PipelineStageService::createDefaults()` now runs inside `TenantContext::runAs($company, …)`: the CompanyObserver fired while a previous tenant was still active and was rejected as a cross-tenant write.
- `InterviewService`: feedback upsert queries the row explicitly instead of `firstOrNew()` on deliberately non-fillable keys (`MassAssignmentException`); `update()` enforces "meeting link or location" after merging input.
- `InterviewRequest`: `meeting_url` is `required_without:location` only on create or when the stored interview no longer complies — reschedule-only updates wrongly returned 422.
- `OfferController::store()` returns the freshly created offer (resource → 201) instead of `fresh()`, matching the `JobPostingController` pattern.

**Environment fixes (local machine only)**
- `C:\php84\php.ini`: enabled `extension=pdo_sqlite` (test database) and `extension=gd` (logo processing).
- XAMPP MariaDB tables repaired and reindexed; `my.ini` `explicit_defaults_for_timestamp` reviewed (migrations set explicit defaults, so the flag is safe as-is).
- Two stuck queue jobs from earlier manual testing remain in the `jobs` table (harmless; clean with `queue:work` or truncate when the queue worker ships in Phase 6).
