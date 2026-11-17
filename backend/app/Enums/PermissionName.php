<?php

namespace App\Enums;

/**
 * Permission catalogue: the single source of truth for permission names.
 * Seeders, policies and the /auth/me payload all read from this enum.
 * The frontend mirrors it in src/types/permissions.ts.
 */
enum PermissionName: string
{
    case JobsView = 'jobs.view';
    case JobsCreate = 'jobs.create';
    case JobsUpdate = 'jobs.update';
    case JobsDelete = 'jobs.delete';
    case JobsPublish = 'jobs.publish';

    case CandidatesView = 'candidates.view';
    case CandidatesCreate = 'candidates.create';
    case CandidatesUpdate = 'candidates.update';
    case CandidatesDelete = 'candidates.delete';

    case ApplicationsView = 'applications.view';
    case ApplicationsUpdateStage = 'applications.update_stage';
    case ApplicationsAssign = 'applications.assign';
    case ApplicationsReject = 'applications.reject';

    case InterviewsView = 'interviews.view';
    case InterviewsSchedule = 'interviews.schedule';
    case InterviewsSubmitFeedback = 'interviews.submit_feedback';

    case OffersView = 'offers.view';
    case OffersCreate = 'offers.create';
    case OffersSend = 'offers.send';
    case OffersApprove = 'offers.approve';

    case AnalyticsView = 'analytics.view';
    case UsersManage = 'users.manage';
    case CompanySettings = 'company.settings';
    case AuditLogsView = 'audit_logs.view';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $permission) => $permission->value, self::cases());
    }
}
