<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Writes audit trail entries. Never store secrets (passwords, tokens) in old/new values.
 */
final class AuditLogger
{
    private const REDACTED_KEYS = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'token', 'token_hash'];

    public function __construct(
        private readonly TenantContext $tenant,
        private readonly Request $request,
    ) {}

    /**
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     */
    public function record(
        string $event,
        ?Model $subject = null,
        ?array $old = null,
        ?array $new = null,
        ?int $companyId = null,
        ?int $actorId = null,
    ): AuditLog {
        return AuditLog::create([
            'company_id' => $companyId ?? ($this->tenant->has() ? $this->tenant->id() : null),
            'actor_id' => $actorId ?? Auth::id(),
            'event' => $event,
            'auditable_type' => $subject?->getMorphClass(),
            'auditable_id' => $subject?->getKey(),
            'old_values' => $old === null ? null : $this->redact($old),
            'new_values' => $new === null ? null : $this->redact($new),
            'ip_address' => $this->request->ip(),
            'user_agent' => mb_substr((string) $this->request->userAgent(), 0, 512) ?: null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function redact(array $values): array
    {
        foreach (self::REDACTED_KEYS as $key) {
            if (array_key_exists($key, $values)) {
                $values[$key] = '[redacted]';
            }
        }

        return $values;
    }
}
