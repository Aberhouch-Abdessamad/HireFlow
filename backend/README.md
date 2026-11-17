# HireFlow API (backend)

Laravel 13 REST API for HireFlow. See the [root README](../README.md) and [`docs/`](../docs) for architecture and setup.

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve           # http://localhost:8000
php artisan test
vendor/bin/pint --test      # code style
```

- API base: `http://localhost:8000/api/v1`
- Health: `GET /api/v1/health`
- OpenAPI UI: `http://localhost:8000/api/documentation`
