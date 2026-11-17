<?php

namespace App\Exceptions;

/**
 * A request that is valid in form but breaks a business rule
 * (e.g. removing the last company admin). It has a stable machine-readable code.
 */
final class BusinessRuleException extends ApiException
{
    public function __construct(string $message, string $code, int $status = 422)
    {
        parent::__construct($message, $status, $code);
    }
}
