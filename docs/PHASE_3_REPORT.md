# Phase 3 Report: Company and Job Management

## 1. What was implemented

**Backend (written; tests not yet run because Composer packages can't be installed here)**

- **Departments:** CRUD for each company. Names are unique within a company. Every member can read them; only `company.settings` holders can manage them. Deleting a department keeps its jobs (their department becomes empty).
- **Skills catalogue for each company:** skills are created automatically from job forms; `GET /skills?search=` serves autocomplete.
- **Job postings** (table `job_postings`, because Laravel's queue already uses a `jobs` table):
  - Fields: title, description, requirements, location, work mode, employment type, experience level, department, salary range + currency + visibility, expiry date, recruiters, required and nice-to-have skills.
  - Lifecycle enforced on the server, with a row lock and an audit entry for each change:
    - Draft → Published, Archived
    - Published → Paused, Closed
    - Paused → Published, Closed
    - Closed → Published (reopen), Archived
    - Archived: read-only
  - A job with a past expiry date can't be published.
  - Only draft or archived jobs can be deleted (soft delete).
  - Department and recruiter ids are checked against the active company. Another company's ids are rejected with a 422.
  - The list endpoint supports search, filters (status, department, type, level, work mode), whitelisted sorting and pagination.
- **Auto-expiry:** the `jobs:close-expired` command runs every 15 minutes and closes published or paused jobs past their expiry date, with an audit entry for each.
- **Company logo upload** on the public disk: PNG, JPG or WebP, at most 2 MB, with dimension limits. SVG is refused because it can contain scripts. The old logo file is deleted when replaced.
- **Public careers API** (`/public/jobs`, `/public/jobs/{slug}`, `/public/companies/{slug}`):
  - Lists only published, unexpired jobs from active companies.
  - Never shows staff names, internal ids, status or hidden salaries.
  - Rate-limited.
- **Demo seeder:** 4 departments and 7 jobs per company, covering every status.

**Frontend (verified: typecheck, lint, 39 tests and production build pass)**

- **Jobs list:** filters stored in the URL (search, status, department, type, sort), pagination, an empty state, and a Create button shown only to users with permission.
- **Create/edit form:** validated with Zod (salary range, currency, future expiry), skill tags with autocomplete, a recruiter multi-select, and server errors shown on the matching fields.
- **Job detail page:** lifecycle buttons generated from `available_transitions`, confirmation before close or archive, edit and delete only when permitted, and a link to the public page.
- **Departments page** (CRUD in a modal) and **logo upload** on the Company profile, using a reusable `FileUploader` that checks file type and size.
- **Public careers site:** `/careers` with filters, company pages via `?company=slug`, and `/careers/jobs/:slug`. Descriptions are shown as plain text, never as HTML.
- **Reusable `StatusBadge`** component.

## 2. API endpoints added

| Method | Path |
|---|---|
| GET / POST | `/departments` |
| PUT / DELETE | `/departments/{id}` |
| GET | `/skills` |
| GET | `/company/recruiters` |
| POST / DELETE | `/company/logo` |
| GET / POST | `/jobs` |
| GET / PUT / DELETE | `/jobs/{id}` |
| POST | `/jobs/{id}/publish`, `/pause`, `/close`, `/archive` |
| GET | `/public/jobs`, `/public/jobs/{slug}`, `/public/companies/{slug}` |

## 3. Database changes

- `departments`, `skills`, `job_postings` (soft deletes, globally unique slug, tenant and status indexes), `job_posting_skill` (`is_required`), and `job_posting_recruiter`.

## 4. Security considerations

- Every lookup is filtered to the active company. Linking to another company's department or recruiter is rejected.
- Public endpoints load related data only through the job's own relations and return a separate, reduced resource.
- Plain-text job content (no HTML) avoids XSS. SVG logos are rejected.
- Status changes require `jobs.publish`, so recruiters can draft and edit jobs but can't publish them.

## 5. Tests added

- Backend: `JobPostingTest` (CRUD, isolation between companies, validation, lifecycle, permissions, filters, expiry command), `DepartmentTest`, `PublicCareersTest`, `CompanyLogoTest`.
- Frontend: job schema and payload mapping, salary formatting, job detail permissions and publishing.

## 6. Remaining work

- Phase 4: candidates, CV upload, public application form (the Apply button on `/careers/jobs/:slug`), applications and the pipeline.
- Phases 5–8.

## 7. Known issues

- Run `php artisan storage:link` once so logos are served from `/storage`.
- The number of applications per job will be added with the applications table in Phase 4.
