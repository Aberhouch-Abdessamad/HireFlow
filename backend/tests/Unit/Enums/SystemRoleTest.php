<?php

namespace Tests\Unit\Enums;

use App\Enums\PermissionName;
use App\Enums\SystemRole;
use PHPUnit\Framework\TestCase;

class SystemRoleTest extends TestCase
{
    public function test_company_admin_has_every_permission(): void
    {
        $this->assertCount(count(PermissionName::cases()), SystemRole::CompanyAdmin->defaultPermissions());
    }

    public function test_hr_manager_cannot_manage_users_settings_or_audit_logs(): void
    {
        $permissions = SystemRole::HrManager->defaultPermissions();

        $this->assertNotContains(PermissionName::UsersManage, $permissions);
        $this->assertNotContains(PermissionName::CompanySettings, $permissions);
        $this->assertNotContains(PermissionName::AuditLogsView, $permissions);
        $this->assertContains(PermissionName::OffersApprove, $permissions);
    }

    public function test_interviewer_permissions_are_minimal(): void
    {
        $this->assertSame(
            [PermissionName::InterviewsView, PermissionName::InterviewsSubmitFeedback],
            SystemRole::Interviewer->defaultPermissions(),
        );
    }

    public function test_recruiter_cannot_approve_offers_or_delete_records(): void
    {
        $permissions = SystemRole::Recruiter->defaultPermissions();

        $this->assertNotContains(PermissionName::OffersApprove, $permissions);
        $this->assertNotContains(PermissionName::JobsDelete, $permissions);
        $this->assertNotContains(PermissionName::CandidatesDelete, $permissions);
    }

    public function test_platform_and_candidate_roles_get_no_company_permissions(): void
    {
        $this->assertSame([], SystemRole::SuperAdmin->defaultPermissions());
        $this->assertSame([], SystemRole::Candidate->defaultPermissions());
    }

    public function test_permission_values_are_unique(): void
    {
        $values = PermissionName::values();
        $this->assertSame($values, array_values(array_unique($values)));
    }
}
