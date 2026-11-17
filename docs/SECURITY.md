# HireFlow security

## Controls in place

- Sanctum cookie/CSRF authentication for the SPA; API requests are forced JSON.
- Tenant context resolution and `BelongsToCompany` scoping on tenant data.
- Permission gates on controllers (e.g. `analytics.view`) and company-admin guards.
- Rate limiting on authentication and public application endpoints.
- Private CV/document downloads via authorized, audited routes.
- Content Security Policy, frame denial, nosniff, referrer and permissions policies (see `SecurityHeaders` middleware).
- Strict transport security enabled for HTTPS requests.
- Automated audit: `composer audit` and `npm audit` currently report no advisories.

## Review checklist

- [x] Dependency audit (backend and frontend) — no known advisories.
- [x] Baseline security headers deployed.
- [ ] Confirm CSP exceptions required by production third-party services.
- [ ] Rotate and protect `APP_KEY`, database credentials, and mail credentials via secret manager.
- [x] OWASP ASVS-oriented review documented for auth, tenant isolation, file upload, and offer response links.

## OWASP review summary

- **A01 Broken access control:** Mitigated by route-level permission gates, company scoping (`BelongsToCompany`), tenant context resolution, and last-admin protection.
- **A02 Cryptographic failures:** Password hashing via bcrypt; offer/access tokens hashed; session encryption enabled in env.
- **A03 Injection:** ORM/Eloquent and validated request classes; no raw user SQL in business services.
- **A04 Insecure design:** Offer approvals use four-eyes rule; hiring only through accepted offers; stage transitions transactional.
- **A05 Security misconfiguration:** Baseline headers, forced JSON API, no guest redirect, rate limits; production env hardening documented.
- **A07 Identification/authentication failures:** Login throttling, 2FA support, password reset without account enumeration, deactivation checks.
- **A08 Software/data integrity:** Signed/hashed offer response tokens; CSRF for SPA auth.
- **A09 Logging/monitoring:** Audit log for auth, company, member, invitation, and recruitment events.
- **A10 SSRF:** Outbound URLs (meeting links) are stored and displayed but not fetched by the application.
- [ ] Add SAST/DAST step to CI if deployment requires it.