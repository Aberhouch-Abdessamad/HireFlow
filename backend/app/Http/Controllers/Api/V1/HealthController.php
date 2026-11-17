<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;
use Throwable;

class HealthController extends Controller
{
    /**
     * Public liveness/readiness information. Reveals no version numbers, hostnames or error details.
     */
    #[OA\Get(
        path: '/api/v1/health',
        operationId: 'health',
        summary: 'API health check',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API is reachable',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'status', type: 'string', enum: ['ok', 'degraded']),
                            new OA\Property(property: 'api_version', type: 'string', example: 'v1'),
                            new OA\Property(property: 'server_time', type: 'string', format: 'date-time'),
                            new OA\Property(property: 'checks', properties: [
                                new OA\Property(property: 'database', type: 'string', enum: ['ok', 'fail']),
                            ], type: 'object'),
                        ], type: 'object'),
                    ],
                ),
            ),
        ],
    )]
    public function __invoke(): JsonResponse
    {
        $database = $this->databaseIsReachable();

        return response()->json([
            'data' => [
                'status' => $database ? 'ok' : 'degraded',
                'api_version' => 'v1',
                'server_time' => now()->utc()->toIso8601String(),
                'checks' => [
                    'database' => $database ? 'ok' : 'fail',
                ],
            ],
        ]);
    }

    private function databaseIsReachable(): bool
    {
        try {
            DB::connection()->getPdo();
            DB::select('select 1');

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}
