# HireFlow Architecture

## 1. Overview

HireFlow is two separate applications that communicate only through a versioned REST API:

- **backend/**: a Laravel 13 modular monolith that serves `/api/v1/*`. It holds all business rules, authorization and tenant isolation.
- **frontend/**: a React + TypeScript single-page application. It is a client of the API and never the place where rules are enforced.

```
Browser ── http://localhost:5173 (Vite dev server)
             ├── /            → React SPA
             ├── /api/*       → proxy → Laravel http://localhost:8000
             └── /sanctum/*   → proxy → Laravel http://localhost:8000
Laravel ── MySQL 8 · database queue (dev) / Redis (prod) · mail (log/Mailpit in dev)
```

In development the Vite proxy puts the SPA and the API on the **same origin**. Sanctum's cookie-based SPA authentication and CSRF protection then work without cross-origin cookie configuration. In production nginx does the same job (Phase 8).

## 2. Backend

### 2.1 Layering

| Layer | Responsibility |
|---|---|
| `Http/Controllers/Api/V1/<Module>` | Thin: receive request → authorize → call service → return resource |
| `Http/Requests/V1/<Module>` | Input validation (Form Requests) |
| `Http/Resources/V1/<Module>` | Output shape; never exposes internal fields (paths, password hashes, 2FA secrets) |
| `Services/<Module>` | Business logic, database transactions, domain events |
| `Policies` | Per-model authorization, including tenant ownership |
| `Enums` | Backed PHP enums for statuses and types |
| `Events` / `Listeners` / `Notifications` / `Jobs` | Side effects (audit, email, in-app), queued |
| `Support/Tenancy` | `TenantContext`, the `BelongsToCompany` trait |

### 2.2 Multi-tenancy

- Single database. Every tenant-owned table has a `company_id` column.
- A user can belong to several companies through `company_user`. `users.current_company_id` stores the active one.
- The `ResolveTenant` middleware resolves the active company from the authenticated user's **active membership**. A `company_id` sent by the client is never trusted.
- The `BelongsToCompany` trait adds a global scope and fills in `company_id` on create. Policies check ownership again as defence in depth.
- Records from another tenant return **404** (scoped bindings), so the API doesn't reveal that they exist.
- Spatie Permission runs in **teams mode** with `company_id` as the team key, so roles apply per company.

### 2.3 Authentication

Sanctum handles SPA cookie sessions and Fortify (headless) handles the auth flows: login, password reset, email verification, password confirmation and TOTP 2FA. No token is ever stored in browser storage.

### 2.4 API conventions

- Prefix `/api/v1`, JSON only.
- Success responses: `{ "data": ..., "meta": ..., "links": ... }`. Paginated collections include `meta.current_page`, `meta.per_page`, `meta.total` and `meta.last_page`.
- Error responses: `{ "message": string, "code": string, "errors"?: Record<string, string[]> }`.
- Filtering and sorting: `?filter[status]=published&sort=-created_at&page=1&per_page=25`. Only whitelisted fields are accepted.
- State changes use explicit action endpoints (`POST /jobs/{id}/publish`), not generic status updates.

## 3. Frontend

```
src/
├── app/         providers, router, route guards, theme tokens
├── layouts/     AppLayout, AuthLayout, PublicLayout
├── features/    one folder per business module (api, queries, schemas, types, components, pages)
├── components/  shared UI (EmptyState, ErrorState, LoadingSkeleton, PageHeader, ...)
├── services/    Axios instance and API error normalisation
├── stores/      Zustand: client/UI state only
├── hooks/       shared hooks (usePermission, ...)
├── types/       API envelope and shared types
└── utils/
```

- **Server state** is handled by TanStack Query only. **Client state** (sidebar, UI preferences) uses Zustand.
- Permission checks in the UI only hide controls. The backend enforces every rule.
- Forms use React Hook Form + Zod. Laravel `422` errors are mapped back onto form fields.

## 4. Security principles

Covered so far: tenant isolation, server-side authorization, CSRF, HttpOnly session cookies, login rate limiting, private document storage behind authorized streaming endpoints, MIME and size validation, append-only audit logs, and no secrets in Git. The rest of the security plan is in [`PHASE_1_PLAN.md`](PHASE_1_PLAN.md) §5.
