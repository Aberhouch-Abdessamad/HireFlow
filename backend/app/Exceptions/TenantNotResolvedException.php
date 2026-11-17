<?php

namespace App\Exceptions;

/**
 * A tenant-owned model was written without an active tenant context. This is a programming
 * error (missing `tenant` middleware, or a queued job that did not restore the context), so it
 * is reported as a 500 and its details are never shown to clients.
 */
final class TenantNotResolvedException extends ApiException
{
    public function __construct()
    {
        parent::__construct('No tenant context is available.', 500, 'TENANT_NOT_RESOLVED');
    }
}
