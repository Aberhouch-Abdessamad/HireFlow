# Phase 6 Report: Dashboard, Analytics and Notifications

## 1. What was implemented (backend)

**Dashboard overview** (`GET /api/v1/dashboard/overview`, `DashboardService`):
- KPI cards computed entirely from the database: published jobs, total candidates, total applications, upcoming scheduled interviews, hires, rejection rate and conversion rate (in range), and average time to hire (days).
- A shared date range (`today`, `7`, `30`, `90`, `custom`) is applied to all rate/time metrics; stock totals remain company-wide.
- Permissions: company admins and recruiters may view; interviewers receive 403.

**Analytics** (`/api/v1/analytics/*`, `AnalyticsService`) — all aggregates run as portable SQL (no DB-specific date functions), with PHP month bucketing and zero-filled series in UTC:
- `applications`: applications/hires/rejections per month.
- `hiring-funnel`: cumulative count by stage type (applied -> screening -> interview -> offer -> hired), current stage distribution, and status split (`active`/`rejected`/`withdrawn`/`hired`).
- `jobs`: jobs per department (total, published, applications in range) and job status split; unassigned jobs land in an "Unassigned" bucket.
- `recruiters`: assigned applications, hires among those, interviews booked and offers created per user.
- `time-to-hire`: average `applied_at -> hired_at`, overall, per month (by hire date) and per job department.

**Notifications**:
- In-app feed backed by Laravel's database channel: `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`. Payload is deliberately flat (`type`/`title`/`message`/`link`) so any notification renders the same way.
- Event-driven listeners (registered by Laravel event discovery) notify the right people for application submitted / stage changed / rejected, interview scheduled / rescheduled / cancelled / completed, offer submitted / approved / returned / sent / accepted / declined / expired, and feedback submitted. Recipients are resolved through Spatie's teams-aware permission scope, so only members of the current company are notified.
- Email notifications are queued (`ShouldQueue`) for `OfferSentNotification` and the interview reminder.
- `InterviewReminderNotification` (in-app + email) and the `interviews:send-reminders` command run hourly: interviews within the next 24 hours notify participants (in-app + email) and the candidate (email). Idempotent through `reminder_sent_at`.

**Date-range and validation**: one `DateRangeRequest` shared by the dashboard and analytics endpoints (custom range requires `from` <= `to`; bad ranges return 422).

**JSON encoding**: dashboard responses use `JSON_PRESERVE_ZERO_FRACTION` so whole-number floats such as `0.0` and `10.0` remain distinguishable from integers.

## 2. API endpoints added

| Area | Endpoints |
|---|---|
| Dashboard | `GET /api/v1/dashboard/overview` |
| Analytics | `GET /api/v1/analytics/applications`, `/hiring-funnel`, `/jobs`, `/recruiters`, `/time-to-hire` |
| Notifications | `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all` |
| Scheduled | `jobs:close-expired` (15 min), `offers:expire` (15 min), `interviews:send-reminders` (hourly) |

All endpoints accept the shared `range`/`from`/`to` query parameters where relevant.

## 3. Database changes

No new tables in Phase 6; reuses existing `notifications`, `application_stage_history`, `jobs` queue table, and tenant-owned domain tables. Relies on `reminder_sent_at` on `interviews`.

## 4. Queue support

- Offer email and interview reminder mail use Laravel's `ShouldQueue` contract with the database queue driver (jobs remain in the `jobs` table).
- The notification feed itself is in-app (database channel) and is not queued, so it is always readable synchronously.

## 5. Security considerations

- All analytics are tenant-scoped by `company_id` on the owning table; queries that join `recruitment_stages` qualify the tenant column to avoid ambiguity and cross-tenant leakage.
- The dashboard/analytics endpoints require the company access permission; interviewers cannot read them.
- Notification endpoints only ever return the authenticated user's own notifications.
- Recipient resolution goes through Spatie teams mode, so a permission grant in one company does not leak to another.
- Reminder and expiry commands restore the tenant context per company inside `TenantContext::runAs`, so every query is scoped correctly.
- Listener recipient queries do not throw when the permission catalogue has not been seeded, allowing graceful degradation.

## 6. Tests added

- `NotificationTest` (11 tests): event-driven recipient routing, in-app feed read/read-all, offer and expiry mail, interview reminder scheduling and idempotency.
- `DashboardTest` (2 tests): KPIs computed from real data including stock vs. range-rate semantics, company isolation, validation, interviewer 403.
- `AnalyticsTest` (6 tests): month zero-filling, hiring funnel and stage distribution, jobs by department/status, recruiter performance, time to hire, interviewer 403.

Full backend suite after Phase 6: `php artisan test` -> **146 tests, 146 passed, 717 assertions** (PHP 8.4).

## 7. Remaining work

- Phase 6 frontend pages (dashboard cards/charts, analytics screens, notification bell) are **not** implemented yet; only the backend is verified.
- Phases 7-8: Playwright end-to-end tests, Docker, CI wiring, deployment and Swagger annotations for every endpoint.
