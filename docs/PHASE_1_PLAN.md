# HireFlow — Phase 1: Environment Audit, Architecture & Plan

Status: **proposal, awaiting approval**. No code, migrations, installs or builds have been run.
Date: 2026-11-17

---

## 0. Environment inspection (findings)

| Item | Finding |
|---|---|
| Repository `Hireflow/` | **Empty** — no files, no `.git`. Greenfield project. |
| Node.js / npm | Node **22** + npm available (in the Linux shell I can reach on your machine) |
| Git | Available |
| PHP / Composer | **Not found** in that shell. Your Windows host may have them (XAMPP/Laragon/Herd) — I can't see that. |
| Docker / MySQL | Not found in that shell. Unknown on the Windows host. |

**Consequence:** Docker Compose should be the single source of truth for PHP 8.3, Composer, MySQL 8 and Redis/Mailpit, so the project runs identically on your machine, in CI, and for anyone cloning the portfolio repo. The frontend can run either in Docker or natively with Node 22.

### Version decisions to confirm

- **Laravel 12 vs 13.** Laravel 13 has shipped (March 2026) and Laravel 12's security support ends **24 Feb 2027**. A portfolio project started now on 12 will be EOL within ~3 months. **Recommendation: Laravel 13** (requires PHP 8.3+, same architecture; everything in this plan applies unchanged). If you need 12 for a specific reason, it works — just note the EOL.
- **Ant Design 6** is current (v5 is maintenance). Recommendation: **antd 6 + React 19**.
- **Tailwind CSS v4** alongside antd: use Tailwind for layout/spacing utilities only, **disable Preflight** (or order it in a CSS `@layer` below antd) so it doesn't reset antd component styles. Keep design tokens (colors, font) in one place: antd `ConfigProvider` theme + Tailwind `@theme` generated from the same TS token file.

---

## 1. Proposed architecture

### 1.1 Topology

```
Browser ──► http://localhost (nginx reverse proxy)
              ├── /            → Vite dev server (dev) / built SPA static files (prod)
              ├── /api/v1/*    → Laravel (php-fpm)
              └── /sanctum/*   → Laravel (CSRF cookie)
Laravel ──► MySQL 8 · Redis (queue, cache, rate limits) · Mailpit (dev SMTP)
Queue worker container (php artisan queue:work)
Scheduler container   (php artisan schedule:work — offer expiry, interview reminders, job expiry)
```

**Why a same-origin reverse proxy:** Sanctum SPA cookie auth is fragile across ports/domains (`SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, CORS `supports_credentials`, SameSite). Serving SPA and API from one origin removes almost all of that friction and mirrors a realistic production setup. The backend and frontend remain fully separate applications and deployables.

### 1.2 Backend: modular monolith

Keep the Laravel layer folders from the spec, but **group by domain inside each layer** so modules stay cohesive:

```
app/
├── Enums/            JobStatus, EmploymentType, ExperienceLevel, ApplicationStatus,
│                     StageType, InterviewType, InterviewStatus, OfferStatus, Recommendation
├── Models/           Company, User, Department, JobPosting, Candidate, Application, ...
│   └── Concerns/     BelongsToCompany (global scope + auto-fill company_id)
├── Support/Tenancy/  TenantContext (holds active Company for the request)
├── Http/
│   ├── Controllers/Api/V1/{Auth,Company,Jobs,Candidates,Applications,Interviews,Offers,Analytics,Public}/
│   ├── Requests/V1/{...same modules...}
│   ├── Resources/V1/{...}
│   └── Middleware/   ResolveTenant, EnsureUserIsActive, ForceJsonResponse
├── Services/{Jobs,Applications,Interviews,Offers,Analytics,Audit}/   ← business logic
├── Policies/
├── Events/ Listeners/ Notifications/ Jobs/(queued)
└── Exceptions/       DomainException types → mapped to consistent JSON errors
```

Rules: controllers are thin (validate via FormRequest → authorize via Policy → call Service → return Resource). Services own transactions. Events decouple side effects (notifications, audit logs) from core logic.

### 1.3 Multi-tenancy model

Single database, shared schema, `company_id` on every tenant-owned table.

1. A user may belong to **several companies** (`company_user` pivot). `users.current_company_id` stores the selected one.
2. `ResolveTenant` middleware loads the user's current company **and verifies active membership** on every request; it never reads a company id from the request body/query/header.
3. `TenantContext` is bound in the container; the `BelongsToCompany` trait adds a global scope (`where company_id = ?`) and fills `company_id` on create.
4. **Policies re-check ownership anyway** (defence in depth — global scopes can be bypassed by `withoutGlobalScopes`, raw queries, or queued jobs).
5. Route model binding is scoped, so `/jobs/{id}` from another company returns **404**, not 403 (no existence leakage).
6. Queued jobs carry `company_id` explicitly and re-establish the tenant context.
7. Switching company: `POST /api/v1/company/switch` validates membership server-side.

### 1.4 Authorization (Spatie Permission in **teams mode**)

- Enable `teams => true` with `team_foreign_key = company_id`. Roles are then **per company** — a person can be Recruiter at Company A and Company Admin at Company B. Without teams mode, roles would leak across tenants. This is the most important RBAC decision.
- **Super Admin**: global role (team `null`), granted via `Gate::before`, limited to platform routes under `/api/v1/admin/*`. It should *not* silently see tenant data through normal routes.
- **Candidate**: not a company member. Candidate portal users are `users` linked to `candidates.user_id`; policies restrict them to their own records. Separate route group, separate guard checks.
- **Interviewer**: policies limit to interviews where they are a participant, and a reduced `CandidateForInterviewerResource` (no salary expectations, internal notes, other feedback).
- Permissions seeded from a single PHP enum/config (`jobs.view`, `applications.update_stage`, …) so seeders, policies and the frontend `/auth/me` payload stay in sync.

### 1.5 Authentication

Use **Laravel Fortify (headless)** on top of Sanctum. It provides login, registration hooks, password reset, email verification, password confirmation and **TOTP two-factor auth with recovery codes** — all of which the spec requires. Hand-rolling 2FA is a security risk and adds nothing to the portfolio. This is the only package I'm adding beyond the spec; see §3.

- Session cookie: `HttpOnly`, `Secure` in prod, `SameSite=Lax`. Nothing auth-related in localStorage.
- Login throttling via `RateLimiter` (per email + IP), lockout events written to the audit log.
- Deactivated users and deactivated memberships are rejected by middleware; sessions are invalidated on deactivation/password change.

### 1.6 Frontend

```
src/
├── app/          providers (QueryClient, ConfigProvider theme, Router), route tree, guards
├── layouts/      AppLayout (collapsible sider), AuthLayout, PublicLayout, CandidateLayout
├── features/     auth, company, jobs, candidates, applications, interviews, offers,
│                 dashboard, notifications, audit, careers, candidate-portal
│   └── <feature>/ api.ts · queries.ts (TanStack hooks + query keys) · schemas.ts (Zod)
│                  · types.ts · components/ · pages/
├── components/   DataTable, PageHeader, StatusBadge, ConfirmDialog, ... (shared only)
├── services/     http.ts (Axios: withCredentials, withXSRFToken, 401/419/422 interceptors)
├── stores/       Zustand: UI (sidebar), session snapshot — NOT server data
├── hooks/        usePermission, useDebounce, useTableParams (URL-synced filters/pagination)
├── types/        API envelope, pagination, shared enums (mirroring backend enums)
└── utils/
```

- Server state = TanStack Query only; Zustand never caches API data.
- `usePermission('jobs.publish')` and `<Can>` hide UI, but the backend is always the enforcement point.
- Forms: React Hook Form + Zod; 422 responses from Laravel are mapped back onto form fields.
- Table filters/sort/pagination live in the URL (shareable, back-button safe).
- `strict: true`, `noUncheckedIndexedAccess`, ESLint `no-explicit-any` as error.

### 1.7 API conventions

- Prefix `/api/v1`; JSON only; resources wrapped in `{ data, meta, links }`.
- Errors: `{ message, code, errors? }` with stable `code` values (e.g. `INVALID_STAGE_TRANSITION`, `DUPLICATE_APPLICATION`).
- Filtering/sorting: `?filter[status]=published&sort=-created_at&per_page=25` with **whitelisted** fields (no raw column names reaching the query).
- State-changing actions are explicit endpoints (`POST /jobs/{id}/publish`), never a generic `status` field in `PUT`.
- OpenAPI generated from code (see §3) to avoid docs drifting from implementation.

---

## 2. Initial database design

Conventions: `bigint unsigned` PKs, `ulid` public identifiers where IDs appear in public URLs, all timestamps UTC, money as `unsigned bigint` minor units + `char(3)` currency, enums as `varchar` backed by PHP enums (easier to evolve than MySQL `ENUM`).

### 2.1 Important naming fix: `jobs`

Laravel's queue uses a table called **`jobs`** (plus `App\Jobs` namespace). A `jobs` business table would collide. **Proposal:** table `job_postings`, model `JobPosting`. The API path stays `/api/v1/jobs` and the UI still says "Jobs".

### 2.2 Tables

**Tenancy & identity**

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `companies` | name, slug, logo_path, website, industry, size, country, timezone, settings (json), is_active, softDeletes | unique(slug) |
| `users` | name, email, password, email_verified_at, two_factor_* (Fortify), current_company_id → companies (null on delete), is_active, last_login_at | unique(email) |
| `company_user` | company_id, user_id, department_id?, job_title, status (active/inactive), joined_at | unique(company_id, user_id); index(user_id) |
| `invitations` | company_id, email, role, token_hash, invited_by, expires_at, accepted_at | unique(company_id, email) where pending (enforced in service); index(token_hash) |
| Spatie: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` | with `company_id` team column | package-defined |

**Organisation**

| Table | Key columns | Constraints |
|---|---|---|
| `departments` | company_id, name, description, softDeletes | unique(company_id, name) |
| `skills` | company_id (null = global catalogue), name, slug | unique(company_id, slug) |
| `recruitment_stages` | company_id, name, slug, position, type (`applied`/`screening`/`interview`/`assessment`/`offer`/`hired`), is_system, is_active | unique(company_id, slug); unique(company_id, position) |

Default 7 stages are created per company on registration. `type` lets business rules work on configurable stages (e.g. "only offer-type stage can create an offer", "hired-type only via accepted offer").

**Jobs**

| Table | Key columns | Constraints |
|---|---|---|
| `job_postings` | company_id, department_id, created_by, ulid, slug, title, description, requirements, location, work_mode (onsite/hybrid/remote), employment_type, experience_level, salary_min, salary_max, salary_currency, salary_visible, status, published_at, expires_at, closed_at, softDeletes | unique(company_id, slug); index(company_id, status); index(status, expires_at) for public listing & expiry job; CHECK salary_min ≤ salary_max |
| `job_posting_skills` | job_posting_id, skill_id, is_required | PK(job_posting_id, skill_id) |
| `job_posting_recruiters` | job_posting_id, user_id | PK(job_posting_id, user_id) |

**Candidates** (company-owned talent pool)

| Table | Key columns | Constraints |
|---|---|---|
| `candidates` | company_id, user_id? (portal account), first_name, last_name, email, phone, location, headline, linkedin_url, portfolio_url, source, softDeletes | unique(company_id, email) — basis for duplicate detection; index(company_id, last_name); FULLTEXT(first_name, last_name, email, headline) |
| `candidate_experiences` | candidate_id, company_name, title, start_date, end_date, is_current, description | index(candidate_id) |
| `candidate_educations` | candidate_id, institution, degree, field, start_date, end_date | index(candidate_id) |
| `candidate_skills` | candidate_id, skill_id, level | PK(candidate_id, skill_id) |
| `candidate_documents` | company_id, candidate_id, type (cv/cover_letter/other), disk, path, original_name, mime_type, size, uploaded_by | index(candidate_id); `path` never serialized |
| `candidate_notes` | company_id, candidate_id, author_id, body | index(candidate_id) |
| `tags`, `candidate_tag` | company_id, name / candidate_id, tag_id | unique(company_id, name) |

Same real person applying to two companies = two `candidates` rows (one per tenant), linked by `user_id` if they use the portal. This keeps tenant isolation absolute: Company A never sees Company B's notes or history.

**Applications (core)**

| Table | Key columns | Constraints |
|---|---|---|
| `applications` | company_id, job_posting_id, candidate_id, current_stage_id → recruitment_stages, status (`active`/`rejected`/`hired`/`withdrawn`), assigned_to?, source, cover_letter, rejection_reason_id?, rejection_note, rejected_at, hired_at, applied_at, softDeletes | **unique(job_posting_id, candidate_id)**; index(company_id, status, current_stage_id); index(company_id, applied_at) for analytics; index(assigned_to) |
| `application_stage_history` | application_id, from_stage_id?, to_stage_id?, from_status, to_status, performed_by?, notes, created_at | index(application_id, created_at); append-only |
| `application_notes` | application_id, author_id, body, visibility | index(application_id) |
| `rejection_reasons` | company_id, label, is_active | unique(company_id, label) |

Rejected is a **status**, not a stage — the application keeps the stage it was rejected from, which is exactly what the funnel analytics need ("rejected at CV screening").

**Interviews**

| Table | Key columns | Constraints |
|---|---|---|
| `interviews` | company_id, application_id, type, status (scheduled/completed/cancelled), scheduled_at, duration_minutes, timezone, meeting_url, location, scheduled_by, cancelled_reason, rescheduled_from_id? | index(company_id, scheduled_at); index(application_id) |
| `interview_participants` | interview_id, user_id, role (interviewer/observer) | PK(interview_id, user_id); index(user_id) |
| `interview_feedback` | interview_id, user_id, technical_score, communication_score, problem_solving_score, overall_rating (1–5), recommendation (strong_hire/hire/no_hire/strong_no_hire), comments, submitted_at | unique(interview_id, user_id) |

**Offers**

| Table | Key columns | Constraints |
|---|---|---|
| `offers` | company_id, application_id, created_by, approved_by?, status, salary_amount, currency, contract_type, start_date, expires_at, sent_at, responded_at, response_note | index(company_id, status); index(status, expires_at) for expiry job. "Only one non-terminal offer per application" enforced in service + lock. |

**Platform**

| Table | Notes |
|---|---|
| `notifications` | Laravel's standard database notifications table |
| `audit_logs` | company_id?, actor_id?, event, auditable_type/id, old_values (json), new_values (json), ip, user_agent, created_at. Append-only: no update/delete routes, model throws on update/delete, prod DB user granted INSERT/SELECT only on this table. index(company_id, created_at), index(auditable_type, auditable_id) |
| `email_templates` | company_id, key, subject, body (with whitelisted placeholders), unique(company_id, key) |
| Laravel infra | `sessions`, `cache`, `jobs`, `failed_jobs`, `job_batches`, `password_reset_tokens` |

### 2.3 Deletion rules (summary)

- Company → soft delete only; hard delete is a Super Admin job that cascades.
- Job posting with applications → soft delete; `restrictOnDelete` at FK level.
- Candidate → soft delete; documents' files removed by a queued job on hard delete (GDPR-style purge).
- History, feedback, audit logs → never cascade-deleted by ordinary users.
- User removal → membership deactivated; authored records keep `performed_by`/`author_id` with `nullOnDelete`.

### 2.4 Pipeline rules (backend-validated)

- Forward moves between active stages: allowed (`applications.update_stage`).
- Backward moves: allowed with a mandatory note.
- Into a `hired`-type stage: **only** via offer acceptance (service-internal).
- Any move on `rejected`/`hired`/`withdrawn` applications: blocked (reopen is a separate, audited action).
- Each transition: `DB::transaction` + `lockForUpdate()` on the application row, write history, dispatch `ApplicationStageChanged` (→ notifications + audit) **after commit**.

---

## 3. Dependencies

### Backend (Composer)

| Package | Purpose | Status |
|---|---|---|
| laravel/framework 13 (or 12) | framework | spec |
| laravel/sanctum | SPA cookie auth | spec |
| spatie/laravel-permission | RBAC (teams mode) | spec |
| **laravel/fortify** | headless auth flows + TOTP 2FA | **added — needs your OK** |
| **dedoc/scramble** *or* darkaonline/l5-swagger | OpenAPI generation | spec says Swagger; **Scramble recommended** (generated from FormRequests/Resources, no annotation drift). Choose one. |
| predis/predis *or* phpredis ext | Redis queue/cache | ext preferred (in Docker image) |
| dev: phpunit, laravel/pint, larastan | tests, formatting, static analysis | Pint ships with Laravel; Larastan **optional, recommended** |

Not adding: a tenancy package (stancl/tenancy etc.) — our single-DB scoping is simple and more instructive to show in a portfolio; an audit package (owen-it/laravel-auditing) — a small custom service gives full control over append-only behaviour. Both can be revisited.

### Frontend (npm)

react, react-dom, react-router, @tanstack/react-query, zustand, axios, react-hook-form, @hookform/resolvers, zod, antd, @ant-design/icons, recharts, dayjs, tailwindcss + @tailwindcss/vite, @fontsource-variable/inter (self-hosted font, no external CDN).

Dev: typescript, vite, @vitejs/plugin-react, vitest, @testing-library/react, @testing-library/user-event, jsdom, msw (**test-only** API mocking — never in the app), eslint + typescript-eslint, prettier, @playwright/test.

### Infrastructure

Docker images: `php:8.3-fpm` (+ pdo_mysql, redis, intl, zip, gd, bcmath), `mysql:8.4`, `redis:7`, `nginx:alpine`, `axllent/mailpit`, `node:22`. GitHub Actions: backend (Pint, Larastan, PHPUnit with MySQL service), frontend (lint, typecheck, Vitest, build), E2E (compose up + Playwright) on main/PR.

---

## 4. Phase 1 implementation plan

Each step is a separate, reviewable commit. Steps marked ⚠ need your authorization because they install packages or run commands.

1. **Repo skeleton** — `git init`, root `.gitignore`, `.editorconfig`, `README.md` stub, `docs/` (this plan, `CHECKLIST.md`, `ARCHITECTURE.md`), `.env.example` files. *(no commands beyond git init)*
2. ⚠ **Docker Compose** — `docker/php/Dockerfile`, `docker/nginx/default.conf`, `docker-compose.yml` with app, queue, scheduler, mysql, redis, mailpit, frontend; healthchecks; named volumes.
3. ⚠ **Laravel scaffold** — `composer create-project` into `backend/` (via the PHP container), install Sanctum (`install:api`), Spatie Permission, Fortify. Configure: API-only routing with `/api/v1` prefix, `statefulApi()`, session/Sanctum/CORS env, UTC timezone, Redis queue, private `local` disk, JSON exception rendering with error codes, `ForceJsonResponse` middleware, health endpoint `GET /api/v1/health`.
4. **Backend foundations** (code only, no migrations run) — Enums, `TenantContext`, `BelongsToCompany`, `ResolveTenant` middleware, base API Resource/response conventions, permission enum + seeder skeleton, domain exception → JSON mapping.
5. ⚠ **React scaffold** — Vite React-TS in `frontend/`, install deps, strict tsconfig, ESLint/Prettier, Tailwind (Preflight off), antd theme from shared tokens, Inter font.
6. **Frontend foundations** — Axios instance (CSRF cookie bootstrap, `withXSRFToken`, interceptors for 401/403/419/422), QueryClient defaults, router with `AppLayout`/`AuthLayout`/`PublicLayout`, `ProtectedRoute` + `RequirePermission` guards (wired to `/auth/me` in Phase 2), `ErrorState`/`EmptyState`/`LoadingSkeleton`, 404 page.
7. ⚠ **Smoke verification** — `docker compose up`, run base migrations, hit `/sanctum/csrf-cookie` and `/api/v1/health` from the SPA through nginx, run the empty PHPUnit + Vitest suites.
8. **CI** — GitHub Actions workflows for backend and frontend (E2E workflow added in Phase 7).
9. **Phase report** — files created/modified, decisions, remaining work, known issues; update `docs/CHECKLIST.md`.

Phase 1 intentionally creates **no business tables** beyond Laravel/Sanctum/Spatie defaults; the schema in §2 lands in Phases 2–5 with the features that use it.

---

## 5. Technical risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | `jobs` table/namespace collision with Laravel queue | Broken queues or confusing code | Rename to `job_postings` / `JobPosting` (§2.1) |
| 2 | Sanctum cookie/CSRF misconfiguration (ports, domains, SameSite) | 419 errors, "logged in but unauthenticated" | Same-origin nginx proxy; explicit env per environment; smoke test in step 7 |
| 3 | Tenant data leakage via unscoped queries (raw SQL, `withoutGlobalScopes`, queued jobs, analytics aggregates, Spatie lookups) | Critical security bug | Global scope + policies + scoped bindings; dedicated cross-tenant test suite for **every** endpoint; Spatie teams mode |
| 4 | Spatie roles global by default | User's role in Company A applies in Company B | `teams => true`, set team id in `ResolveTenant` before permission checks |
| 5 | Laravel 12 EOL (Feb 2027) | Portfolio on unsupported framework | Start on Laravel 13 (decision needed) |
| 6 | Tailwind Preflight vs antd styles | Broken buttons/inputs | Disable Preflight / CSS layer order; use Tailwind for layout only |
| 7 | Race conditions on stage moves, offer acceptance, duplicate public applications | Inconsistent pipeline, double hires | Transactions + `lockForUpdate`; DB unique constraints as the final guard; idempotent endpoints |
| 8 | Public apply endpoint abuse (spam, large files, malware) | Storage/DoS, malicious files | Per-IP + per-job rate limits, honeypot field, MIME sniffing (not extension), size cap (e.g. 5 MB), random filenames on private disk, optional ClamAV later |
| 9 | Analytics performance (funnel, time-to-hire) on growing data | Slow dashboard | Composite indexes from §2, aggregate queries in a dedicated service, short-TTL cache per company + date range |
| 10 | Timezones (interviews across zones, UTC storage) | Wrong interview times | Store UTC + IANA timezone on interviews; convert only in the UI with dayjs utc/timezone |
| 11 | Windows host + Docker bind mounts | Very slow `vendor/` & `node_modules` I/O | Recommend WSL2 and cloning the repo inside the WSL filesystem; named volumes for vendor/node_modules |
| 12 | Spec inconsistencies (below) | Rework later | Resolve now |

### Spec inconsistencies to resolve

1. **`offers.approve` permission exists, but offer statuses have no approval step** (Draft → Sent). Options: (a) add `PendingApproval`/`Approved` statuses, or (b) drop `offers.approve`. Recommend (a) — realistic and showcases workflow logic.
2. **Public apply: account required or not?** Recommend: guest apply allowed (creates/matches candidate by email per company); portal account optional, linked by verified email.
3. **`POST /auth/verify-email`** — Laravel uses signed GET links. Plan: email link opens the SPA, which POSTs the signed params to the API. Same outcome, SPA-friendly.
4. **Company switching** isn't in the endpoint list but is required by multi-company membership. Adding `POST /company/switch` and `GET /auth/companies`.

---

## 6. Decisions log (2026-11-17)

| Decision | Choice | Effect on plan |
|---|---|---|
| Framework | **Laravel 13** | PHP 8.3+ required |
| Dev environment | **Native PHP 8.3 / Composer / MySQL 8 on Windows** | Docker Compose moves to Phase 8 (deployment/CI only). Same-origin dev setup via the **Vite dev-server proxy**: `/api` and `/sanctum` → `http://localhost:8000`, SPA on `http://localhost:5173`. Queue uses the `database` driver locally (no Redis needed); Mailpit/`log` mailer for email. |
| Offers | **Add approval step** | Statuses: Draft → PendingApproval → Approved → Sent → Accepted / Rejected / Expired (+ Withdrawn). `offers.approve` gates Approved. |
| Extra packages | **Fortify approved**; Scramble and Larastan not approved | OpenAPI via **darkaonline/l5-swagger** (as in spec). No static-analysis package. |

Still open: account-optional public apply (§5 item 2) and the `POST /company/switch` endpoint (§5 item 4) — proceeding with the recommendations unless you say otherwise.

## 7. Original decision list

1. Laravel **13** (recommended) or 12?
2. Approve **Fortify** for auth/2FA?
3. OpenAPI: **Scramble** (recommended) or l5-swagger?
4. Development environment: **Docker (WSL2)** (recommended) or native PHP/MySQL on Windows?
5. Offer approval step: add it, or drop `offers.approve`?
6. Authorization to run the ⚠ steps (package installs, scaffolding commands, `docker compose up`, base migrations).
