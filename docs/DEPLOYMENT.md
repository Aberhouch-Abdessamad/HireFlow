# HireFlow deployment

## Local Docker (full stack)

```bash
cp backend/.env.example backend/.env
# set APP_KEY (see below), DB_* values are already overridden by compose
docker compose up --build
```

The stack exposes the backend on `http://localhost:8000` and the SPA on `http://localhost:8080`.
The frontend container proxies `/api`, `/sanctum` and `/up` to the backend container, so Sanctum
stays first-party.

## Required secrets

- `APP_KEY` — generate with `php artisan key:generate --show` and inject via environment.
- `APP_URL` / `FRONTEND_URL` — public URLs of the API and SPA.
- Database credentials (`DB_*`).
- `SANCTUM_STATEFUL_DOMAINS` — include the SPA host:port.
- `SESSION_SECURE_COOKIE=true` and `SESSION_SAME_SITE=none` (or `lax`) behind HTTPS.

## Application key bootstrap

`APP_KEY` must be stable across backend and queue containers. Set it explicitly instead of
relying on the entrypoint generator.

## Queue and scheduler

- Queue worker: `php artisan queue:work`
- Interview reminders: schedule `interviews:send-reminders` hourly (`php artisan schedule:run`)
- Register the scheduler via cron or a container sidecar.

## Storage

Mount `storage/` (or use a shared volume) so uploaded CVs and logos survive restarts.
Run `php artisan storage:link` once.

## Production hardening

- Terminate TLS at the reverse proxy and set `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=none` or `lax`, and `APP_ENV=production`, `APP_DEBUG=false`.
- Inject secrets via a secret manager or orchestrator secrets; do not bake `APP_KEY` into images.
- Run daily database backups and test restore procedures.
- Send application logs to an aggregator and alert on queue failures and failed jobs.
- Keep the queue worker and scheduler in separate containers/processes with restart policies.
- Restrict `/api/documentation` exposure in production if the API is not public.

## OpenAPI

The L5-Swagger spec is available at `/api/documentation` and can be regenerated with
`php artisan l5-swagger:generate`.