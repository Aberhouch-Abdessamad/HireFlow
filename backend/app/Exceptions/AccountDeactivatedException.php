<?php

namespace App\Exceptions;

final class AccountDeactivatedException extends ApiException
{
    public function __construct()
    {
        parent::__construct(
            'Your account has been deactivated. Contact your company administrator.',
            403,
            'ACCOUNT_DEACTIVATED',
        );
    }
}
