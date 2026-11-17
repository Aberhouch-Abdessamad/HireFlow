<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Base class for expected, client-facing errors.
 *
 * Each subclass has a stable machine-readable error code and an HTTP status. The
 * ApiExceptionRenderer turns them into { message, code } JSON responses.
 */
abstract class ApiException extends RuntimeException
{
    public function __construct(
        string $message = '',
        protected int $status = 400,
        protected string $errorCode = 'BAD_REQUEST',
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function status(): int
    {
        return $this->status;
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }
}
