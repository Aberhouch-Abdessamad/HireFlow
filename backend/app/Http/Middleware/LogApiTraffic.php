<?php

namespace App\Http\Middleware;

use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Local debugging log of every /api call, written to storage/logs/api-YYYY-MM-DD.log.
 * Each entry has a header (method, path, status, time, user, company), a ready-to-run
 * curl command that replays the call, the request body and the JSON answer:
 *
 *   ┌─ POST /api/v1/auth/login ─────────────────────────── ✔ 200 OK · 645 ms
 *      2026-11-17 15:16:18 · guest · company - · 127.0.0.1
 *
 *    ▸ curl
 *      curl -X POST 'http://localhost:8000/api/v1/auth/login' \
 *        ...
 *
 *    ▸ request
 *      { "email": "ada@acme.test", "password": "<password>" }
 *
 *    ▸ response
 *      { "two_factor": false }
 *
 *   └────────────────────────────────────────────────────────────────────────
 *
 * Off unless API_LOG_ENABLED=true; answers contain personal data, so never enable it in
 * production. Secrets are always replaced by placeholders (<password>, <token>, …), session
 * cookies and CSRF tokens are never written, uploads are summarised and downloads skipped.
 */
class LogApiTraffic
{
    private const WIDTH = 96;

    /** Keys whose values are never written, in requests or responses. */
    private const REDACT = [
        'password', 'password_confirmation', 'current_password', 'new_password',
        'token', 'remember_token', 'recovery_code', 'two_factor_secret',
        'two_factor_recovery_codes', 'recovery_codes', 'secret', 'secret_key',
        'qr_code', 'svg', 'signature',
    ];

    /** Request-only keys: "code" is a 2FA code in requests but the error code in responses. */
    private const REDACT_REQUEST = ['code'];

    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! config('logging.api_traffic.enabled') || ! $request->is('api/*')) {
            return $next($request);
        }

        $started = microtime(true);
        $response = $next($request);

        try {
            $this->write($request, $response, (int) round((microtime(true) - $started) * 1000));
        } catch (Throwable) {
            // Logging must never break a request.
        }

        return $response;
    }

    private function write(Request $request, Response $response, int $ms): void
    {
        $status = $response->getStatusCode();
        $title = sprintf('┌─ %s %s ', $request->getMethod(), $request->getRequestUri());
        $badge = sprintf(' %s %d %s · %d ms', $this->icon($status), $status, Response::$statusTexts[$status] ?? '', $ms);
        $fill = max(3, self::WIDTH - mb_strlen($title) - mb_strlen($badge));

        $user = $request->user();
        $lines = [
            $title.str_repeat('─', $fill).$badge,
            '   '.implode(' · ', [
                now()->format('Y-m-d H:i:s'),
                $user ? 'user #'.$user->getAuthIdentifier() : 'guest',
                'company '.($this->tenant->has() ? '#'.$this->tenant->id() : '-'),
                $request->ip() ?? '-',
            ]),
        ];

        $body = $this->requestData($request);

        $this->section($lines, 'curl', $this->curl($request, $body, $user !== null));
        if ($body !== null) {
            $this->section($lines, 'request', $this->encode($body));
        }
        $this->section($lines, 'response', $this->responseBody($response));
        $lines[] = '';
        $lines[] = '└'.str_repeat('─', self::WIDTH - 1);

        Log::channel('api')->info(implode(PHP_EOL, $lines).PHP_EOL);
    }

    /** @param  list<string>  $lines */
    private function section(array &$lines, string $name, string $content): void
    {
        // Plain indentation (no box characters) so blocks can be copied straight into a terminal.
        $lines[] = '';
        $lines[] = ' ▸ '.$name;
        foreach (explode("\n", $content) as $line) {
            $lines[] = '   '.$line;
        }
    }

    private function icon(int $status): string
    {
        return match (true) {
            $status >= 400 => '✖',
            $status >= 300 => '↪',
            default => '✔',
        };
    }

    /**
     * Request body with secrets replaced by placeholders and files summarised, or null for
     * requests without a body.
     *
     * @return array<mixed>|null
     */
    private function requestData(Request $request): ?array
    {
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return null;
        }

        $data = $request->request->all() ?: ($request->isJson() ? (array) $request->json()->all() : []);
        foreach ($request->allFiles() as $key => $file) {
            $data[$key] = $this->describeFiles($file);
        }

        return $data === [] ? null : $this->redact($data, self::REDACT_REQUEST, placeholders: true);
    }

    /**
     * A curl command that replays the call. Session cookies and the CSRF token are never
     * logged: authenticated calls read them from a cookie jar (cookies.txt) instead.
     *
     * @param  array<mixed>|null  $body
     */
    private function curl(Request $request, ?array $body, bool $authenticated): string
    {
        $method = $request->getMethod();
        $parts = [
            sprintf('curl -X %s %s', $method, $this->quote($request->getSchemeAndHttpHost().$request->getRequestUri())),
            "-H 'Accept: application/json'",
        ];

        // Sanctum only uses the session for requests coming from the SPA's origin.
        $origin = $request->headers->get('Origin') ?? config('app.frontend_url');
        if ($authenticated || $request->is('api/v1/auth/*')) {
            $parts[] = '-H '.$this->quote('Origin: '.$origin);
            $parts[] = '-b cookies.txt -c cookies.txt';
            if (! in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
                // $XSRF is set by `source scripts/api-login.sh` (see docs/API_LOG.md).
                $parts[] = '-H "X-XSRF-TOKEN: $XSRF"';
            }
        }

        if ($body !== null) {
            if ($request->allFiles() !== []) {
                foreach ($this->flatten($body) as $key => $value) {
                    $parts[] = '-F '.$this->quote($key.'='.$value);
                }
            } else {
                $parts[] = "-H 'Content-Type: application/json'";
                $parts[] = '--data-raw '.$this->quote((string) json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            }
        }

        return implode(" \\\n  ", $parts);
    }

    /**
     * Flattens nested input to multipart field names (skills[0][name]=…), uploads as @file.
     *
     * @param  array<mixed>  $data
     * @return array<string, string>
     */
    private function flatten(array $data, string $prefix = ''): array
    {
        $fields = [];
        foreach ($data as $key => $value) {
            $name = $prefix === '' ? (string) $key : "{$prefix}[{$key}]";
            if (is_array($value)) {
                $fields += $this->flatten($value, $name);
            } elseif (is_string($value) && str_starts_with($value, '[file ')) {
                $fields[$name] = '@<path to file>';
            } else {
                $fields[$name] = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
            }
        }

        return $fields;
    }

    private function quote(string $value): string
    {
        return "'".str_replace("'", "'\\''", $value)."'";
    }

    private function responseBody(Response $response): string
    {
        if ($response instanceof BinaryFileResponse || $response instanceof StreamedResponse) {
            return '[file download, not logged]';
        }

        $content = (string) $response->getContent();
        if ($content === '') {
            return '[empty]';
        }

        $decoded = json_decode($content, true);

        return is_array($decoded)
            ? $this->encode($this->redact($decoded))
            : $this->truncate('[non-JSON '.$response->headers->get('Content-Type', 'unknown').'] '.$content);
    }

    private function describeFiles(mixed $file): mixed
    {
        if (is_array($file)) {
            return array_map(fn ($f) => $this->describeFiles($f), $file);
        }

        return $file instanceof UploadedFile
            ? sprintf('[file %s, %d KB]', $file->getClientOriginalName(), (int) ceil($file->getSize() / 1024))
            : '[file]';
    }

    /**
     * @param  array<mixed>  $data
     * @param  list<string>  $extra
     * @return array<mixed>
     */
    private function redact(array $data, array $extra = [], bool $placeholders = false): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), [...self::REDACT, ...$extra], true)) {
                $data[$key] = $placeholders ? '<'.strtolower($key).'>' : '[redacted]';
            } elseif (is_array($value)) {
                $data[$key] = $this->redact($value, $extra, $placeholders);
            }
        }

        return $data;
    }

    /** @param  array<mixed>  $data */
    private function encode(array $data): string
    {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);

        return $this->truncate((string) $json);
    }

    private function truncate(string $text): string
    {
        $max = max(200, (int) config('logging.api_traffic.max_body', 4000));

        return mb_strlen($text) > $max
            ? mb_substr($text, 0, $max)."\n… (".(mb_strlen($text) - $max).' more characters)'
            : $text;
    }
}
