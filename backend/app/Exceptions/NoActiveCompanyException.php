<?php

namespace App\Exceptions;

final class NoActiveCompanyException extends ApiException
{
    public function __construct()
    {
        parent::__construct(
            'You are not an active member of any company.',
            403,
            'NO_ACTIVE_COMPANY',
        );
    }
}
