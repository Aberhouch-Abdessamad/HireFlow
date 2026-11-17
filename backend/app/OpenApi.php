<?php

namespace App;

/**
 * @OA\Info(
 *     title="HireFlow API",
 *     version="1.0.0",
 *     description="Multi-tenant hiring API"
 * )
 *
 * @OA\Server(
 *     url=L5_SWAGGER_CONST_HOST,
 *     description="HireFlow API server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer"
 * )
 */
final class OpenApi {}
