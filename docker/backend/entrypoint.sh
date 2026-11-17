#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

if [ "${APP_KEY:-}" = "" ]; then
  php artisan key:generate --force
fi

php artisan migrate --force --seed 2>/dev/null || php artisan migrate --force

php artisan storage:link 2>/dev/null || true

exec "$@"