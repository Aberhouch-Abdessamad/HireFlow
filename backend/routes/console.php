<?php

use Illuminate\Support\Facades\Schedule;

/*
| Scheduled tasks. Run `php artisan schedule:work` locally, or a cron entry calling
| `php artisan schedule:run` every minute in production.
*/

Schedule::command('jobs:close-expired')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('offers:expire')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('interviews:send-reminders')->hourly()->withoutOverlapping();
