<?php

use Illuminate\Support\Facades\Route;

// HireFlow's UI is a separate React application. The backend serves only the API.
Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api/v1'),
    'documentation' => url('/api/documentation'),
]));
