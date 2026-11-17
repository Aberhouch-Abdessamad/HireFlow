/** Payload of GET /api/v1/health. */
export interface HealthStatus {
  status: 'ok' | 'degraded';
  api_version: string;
  server_time: string;
  checks: {
    database: 'ok' | 'fail';
  };
}
