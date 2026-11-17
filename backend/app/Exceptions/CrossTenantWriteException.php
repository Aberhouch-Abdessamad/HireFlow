<?php

namespace App\Exceptions;

/** Raised when code tries to write a record that belongs to a different tenant than the active one. */
final class CrossTenantWriteException extends ApiException
{
    public function __construct()
    {
        parent::__construct('Cross-tenant write rejected.', 500, 'CROSS_TENANT_WRITE');
    }
}
