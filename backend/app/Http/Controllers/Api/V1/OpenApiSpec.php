<?php

namespace App\Http\Controllers\Api\V1;

use OpenApi\Attributes as OA;

/**
 * Root OpenAPI definition for the HireFlow v1 API (rendered by l5-swagger at /api/documentation).
 */
#[OA\Info(
    version: '1.0.0',
    description: 'HireFlow Applicant Tracking System REST API. Authentication uses Laravel Sanctum SPA cookies: call GET /sanctum/csrf-cookie first, then send the X-XSRF-TOKEN header.',
    title: 'HireFlow API',
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST, description: 'Current environment')]
#[OA\Tag(name: 'System', description: 'Health and diagnostics')]
final class OpenApiSpec {}
