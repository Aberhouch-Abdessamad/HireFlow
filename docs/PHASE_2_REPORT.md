# Phase 2 Report: Authentication and Multi-Tenancy

## 1. What was implemented

**Backend (written; tests not yet run, see §8)**

- **Company registration** (`POST /auth/register`, a Fortify action): creates the company, its first Company Admin, the membership and the role in one transaction. Rate-limited to 5 per IP per hour. Sends a verification email.
- **Sessions:** login, logout, 2FA challenge, password reset and password change through Fortify. Login is refused for deactivated users. The forgot-password response is the same for known and unknown emails (no account enumeration).
- **Email verification for the SPA:** the email links to `/verify-email` in the SPA, which posts the signed parameters to `POST /auth/verify-email` (relative signature, so it works behind the proxy). Unverified users get `EMAIL_NOT_VERIFIED` (403) on company endpoints.
- **`GET /auth/me`:** user, active company, and roles and permissions *for that company only*. Also `PUT /auth/profile`, `GET /auth/companies` and `POST /company/switch` (the server checks membership).
- **Company profile:** `GET /company` for members; `PUT /company` requires `company.settings`.
- **Members:** list with search, status filter and pagination; change role; deactivate; reactivate. Rules:
  - you can't change your own role or deactivate yourself;
  - every company keeps at least one active Company Admin (locked inside a transaction);
  - Super Admin and Candidate can't be assigned by a company;
  - another company's member ids return 404.
- **Invitations:** SHA-256-hashed single-use tokens that expire after 7 days, with queued email, revoke, public preview and accept.
  - Existing accounts must be signed in as the invited email to accept.
  - New accounts are created already verified.
  - A new invitation replaces any older pending one for the same email.
- **Audit log (append-only):**
  - Events recorded: login, failed login, logout, email verified, company registered/updated/switched, member role changed/deactivated/activated, invitation created/revoked/accepted, profile updated.
  - Secrets are redacted.
- **Middleware order:** tenant resolution now runs *before* route model binding, so bound models are already filtered to the active company.
- **Demo seeder:**
  - Super Admin, two companies (Acme Robotics, Globex Health) with one user per role, and a recruiter who belongs to both.
  - Password `Password123!`.
  - Every email uses the reserved `.test` domain.

**Frontend (verified: typecheck, lint, 31 tests and production build pass)**

- **Auth pages:** login (2FA aware, safe `?redirect=`), company registration, forgot and reset password, 2FA challenge (code or recovery code), and email verification.
- **Guards:**
  - `ProtectedRoute`: signed in → email verified → active company.
  - `GuestRoute` for signed-out pages.
  - The first permitted page is chosen automatically.
  - Any 401 resets the session.
- **App shell:** user menu (profile, sign out) and a company switcher. Switching company clears every cached query, so data from one company never shows in another.
- **My profile:** name, password change, and 2FA setup (QR shown as an image, never as raw HTML), recovery codes and turning 2FA off. The password-confirmation prompt (423) is handled automatically.
- **Team members:** table with inline role change, deactivate/reactivate, search and status filter; pending invitations with revoke; invite modal.
- **Company profile form** and the **public invitation acceptance page**.
- **Code splitting:** pages load lazily, and the main bundle dropped from 896 KB to about 180 KB (antd sits in a shared chunk).

## 2. API endpoints added

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Company + admin |
| POST | `/auth/verify-email` | Signed |
| POST | `/auth/email/verification-notification` | Resend |
| GET | `/auth/me` | |
| PUT | `/auth/profile` | |
| GET | `/auth/companies` | |
| POST | `/company/switch` | |
| GET / PUT | `/company` | |
| GET | `/company/members` | |
| PUT | `/company/members/{id}/role` | |
| DELETE | `/company/members/{id}` | Deactivates |
| POST | `/company/members/{id}/activate` | |
| GET / POST | `/company/invitations` | |
| DELETE | `/company/invitations/{id}` | |
| GET | `/invitations/{token}` | Public |
| POST | `/invitations/{token}/accept` | Public |

These are in addition to the Fortify endpoints listed in the Phase 1 report.

## 3. Database changes

- `invitations` (company_id, email, role, unique token_hash, invited_by, expires_at, accepted_at, revoked_at)
- `audit_logs` (company_id, actor_id, event, auditable morph, old/new JSON, ip, user agent, created_at)
- `User` now implements `MustVerifyEmail`.

## 4. Security considerations

- The tenant always comes from the server-side membership.
- Cross-tenant ids return 404.
- Roles are per company. Super Admin can't be granted by a company.
- Invitation tokens are hashed at rest, single-use and time-limited.
- The last-admin check runs under a row lock.
- No account enumeration on forgot-password. Failed and successful logins are audited.
- The verification link is signed and time-limited, and the user id + email hash are checked.
- Open-redirect protection on `?redirect=`.
- The cache is wiped on logout and on company switch.

## 5. Backend tests added

`RegistrationTest`, `EmailVerificationTest`, `PasswordResetTest`, `AuditTrailTest`, `CompanyProfileTest`, `MembersTest`, `InvitationsTest`.

## 6. Remaining work

Phases 3–8: jobs, public careers page, candidates, applications and pipeline, interviews, offers, dashboard and analytics, notifications UI, E2E tests, Docker, deployment.

## 7. Known issues

- Fortify's `forgot-password` route has no throttle of its own. Laravel's password broker still limits sending to one email per minute per account.
- Changing the email address isn't supported yet (it needs re-verification).

## 8. Verification status

The backend still hasn't been run in Claude's environment, because `repo.packagist.org` is blocked there. Run `php artisan test` locally; any failures are expected to be small integration fixes.
