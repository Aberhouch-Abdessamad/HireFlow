<?php

namespace App\Notifications;

use App\Models\Application;

/** Sent to users who can assign applications: a new application needs triage. */
final class ApplicationSubmittedNotification extends CompanyNotification
{
    public function __construct(public readonly Application $application) {}

    public function type(): string
    {
        return 'application.submitted';
    }

    public function title(): string
    {
        return 'New application';
    }

    public function message(): string
    {
        return sprintf(
            '%s applied for "%s".',
            $this->application->candidate->full_name,
            $this->application->jobPosting->title,
        );
    }

    public function link(): string
    {
        return '/applications/'.$this->application->id;
    }
}
