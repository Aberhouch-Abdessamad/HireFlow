<?php

namespace App\Enums;

/**
 * Built-in roles. Company roles are Spatie "global" roles (company_id = NULL) that are assigned
 * per company through teams mode, so a user can hold different roles in different companies.
 */
enum SystemRole: string
{
    case SuperAdmin = 'super_admin';
    case CompanyAdmin = 'company_admin';
    case HrManager = 'hr_manager';
    case Recruiter = 'recruiter';
    case Interviewer = 'interviewer';
    case Candidate = 'candidate';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::CompanyAdmin => 'Company Admin',
            self::HrManager => 'HR Manager',
            self::Recruiter => 'Recruiter',
            self::Interviewer => 'Interviewer',
            self::Candidate => 'Candidate',
        };
    }

    /** Roles that can be assigned to company members. */
    public static function companyRoles(): array
    {
        return [self::CompanyAdmin, self::HrManager, self::Recruiter, self::Interviewer];
    }

    /**
     * Default permissions per role.
     *
     * Super Admin gets platform access through a Gate::before check, not through a permission list.
     * Candidates are not company members: they can access only their own records, which policies enforce.
     *
     * @return list<PermissionName>
     */
    public function defaultPermissions(): array
    {
        return match ($this) {
            self::SuperAdmin, self::Candidate => [],

            self::CompanyAdmin => PermissionName::cases(),

            self::HrManager => array_values(array_filter(
                PermissionName::cases(),
                static fn (PermissionName $p) => ! in_array($p, [
                    PermissionName::CompanySettings,
                    PermissionName::UsersManage,
                    PermissionName::AuditLogsView,
                ], true),
            )),

            self::Recruiter => [
                PermissionName::JobsView,
                PermissionName::JobsCreate,
                PermissionName::JobsUpdate,
                PermissionName::CandidatesView,
                PermissionName::CandidatesCreate,
                PermissionName::CandidatesUpdate,
                PermissionName::ApplicationsView,
                PermissionName::ApplicationsUpdateStage,
                PermissionName::ApplicationsAssign,
                PermissionName::ApplicationsReject,
                PermissionName::InterviewsView,
                PermissionName::InterviewsSchedule,
                PermissionName::InterviewsSubmitFeedback,
                PermissionName::OffersView,
                PermissionName::OffersCreate,
                PermissionName::AnalyticsView,
            ],

            // Interviewers only see interviews they are assigned to (enforced by policies).
            self::Interviewer => [
                PermissionName::InterviewsView,
                PermissionName::InterviewsSubmitFeedback,
            ],
        };
    }
}
