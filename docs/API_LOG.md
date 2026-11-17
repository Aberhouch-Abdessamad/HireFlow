# API log (local debugging)

With `API_LOG_ENABLED=true` in `backend/.env`, every `/api` call is written to
`backend/storage/logs/api-YYYY-MM-DD.log` (one file per day, kept 7 days). Errors go to
`backend/storage/logs/errors.log`, one line each.

Each entry looks like this:

```
┌─ GET /api/v1/offers?status=draft&per_page=1 ───────────────────── ✔ 200 OK · 87 ms
   2026-11-17 15:21:53 · user #3 · company #1 · 127.0.0.1

 ▸ curl
   curl -X GET 'http://localhost:8000/api/v1/offers?status=draft&per_page=1' \
     -H 'Accept: application/json' \
     -H 'Origin: http://localhost:5173' \
     -b cookies.txt -c cookies.txt

 ▸ response
   { "data": [ ... ] }
└──────────────────────────────────────────────────────────────────────────────────
```

`✔` = 2xx, `↪` = 3xx, `✖` = 4xx/5xx. POST/PUT/DELETE entries also have a `▸ request` block.

## Replaying a call with curl

The curl commands are written for **Git Bash** (or macOS/Linux terminals); Windows
PowerShell and cmd use different quoting.

1. Sign in once (from the project root). This saves your session to `cookies.txt` and
   exports `$XSRF`:

   ```bash
   source scripts/api-login.sh recruiter@acme.test 'Password123!'
   ```

2. Copy any `▸ curl` block from the log and run it in the same terminal.

Secrets are never written: passwords, tokens and 2FA codes appear as placeholders such as
`<password>`, so replace them before re-running a login or password call. Session cookies
and CSRF tokens are never logged; the commands read them from `cookies.txt` and `$XSRF`.

## Safety

API answers contain candidates' personal data. Keep `API_LOG_ENABLED=false` in production
(it is off by default), and don't commit `cookies.txt`.
