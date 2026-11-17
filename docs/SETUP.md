# HireFlow: local setup (Windows, native)

## 0. Prerequisites

```powershell
php -v              # 8.3 or newer
composer -V         # 2.x
mysql --version     # 8.x
node -v             # 22.12 or newer
php -m | Select-String -Pattern "pdo_mysql|pdo_sqlite|mbstring|openssl|fileinfo|intl|zip|bcmath"
```

All eight PHP extensions must be listed. Enable any missing ones in `php.ini` (for example `extension=intl`). `pdo_sqlite` is used by the test suite (in-memory database).

## 1. Create the database (once)

Run this in the MySQL client as root:

```sql
CREATE DATABASE hireflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hireflow'@'localhost' IDENTIFIED BY 'choose-a-local-password';
GRANT ALL PRIVILEGES ON hireflow.* TO 'hireflow'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Backend (once)

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Edit `backend\.env` and set `DB_PASSWORD` to the password you chose above. Then:

```powershell
php artisan migrate --seed
php artisan storage:link   # serves company logos from /storage
php artisan test
vendor\bin\pint          # applies the project code style (CI runs pint --test)
```

`composer install` creates `composer.lock`. Commit it.

## 3. Frontend (once)

```powershell
cd ..\frontend
copy .env.example .env
npm install
npm test
```

## 4. Start the project

From the `Hireflow` folder:

```powershell
.\scripts\dev.ps1
```

This opens three terminals: the API on http://localhost:8000, the queue worker, and the SPA on http://localhost:5173.

Open **http://localhost:5173/status**. Both cards should be green:

- **API**: status ok, database ok
- **Session security**: CSRF cookie received

That confirms the browser → Vite proxy → Laravel → MySQL path, plus Sanctum's CSRF handshake.

Other URLs:

- API health: http://localhost:8000/api/v1/health
- OpenAPI docs: http://localhost:8000/api/documentation

## 5. Git and CI (once)

Claude's tools can't write inside `.github/`, so the CI workflows were saved to `ci-workflows/`. Move them into place, then initialise Git:

```powershell
New-Item -ItemType Directory -Force .github\workflows | Out-Null
Move-Item ci-workflows\*.yml .github\workflows\
Remove-Item ci-workflows
git init -b main
git add .
git commit -m "chore: project foundation (phase 1)"
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/status` shows "Unable to reach the server" | The API isn't running on :8000. Run `php artisan serve` in `backend`. |
| Database shows `fail` | Check the `DB_*` values in `backend\.env` and that MySQL is running. |
| 419 CSRF errors | Open the app through http://localhost:5173 (not 127.0.0.1) to match `SANCTUM_STATEFUL_DOMAINS`. |
| `could not find driver` | Enable `pdo_mysql` (or `pdo_sqlite` for tests) in `php.ini`. |
