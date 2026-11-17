<?php

use App\Http\Controllers\Api\V1\Analytics\AnalyticsController;
use App\Http\Controllers\Api\V1\Applications\ApplicationController;
use App\Http\Controllers\Api\V1\Applications\ApplicationNoteController;
use App\Http\Controllers\Api\V1\Applications\RecruitmentStageController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Candidates\CandidateController;
use App\Http\Controllers\Api\V1\Candidates\CandidateDocumentController;
use App\Http\Controllers\Api\V1\Candidates\CandidateNoteController;
use App\Http\Controllers\Api\V1\Candidates\TagController;
use App\Http\Controllers\Api\V1\Company\AssignableUserController;
use App\Http\Controllers\Api\V1\Company\CompanyController;
use App\Http\Controllers\Api\V1\Company\CompanyLogoController;
use App\Http\Controllers\Api\V1\Company\InvitationController;
use App\Http\Controllers\Api\V1\Company\MemberController;
use App\Http\Controllers\Api\V1\Company\PublicInvitationController;
use App\Http\Controllers\Api\V1\Dashboard\DashboardController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Interviews\InterviewController;
use App\Http\Controllers\Api\V1\Jobs\DepartmentController;
use App\Http\Controllers\Api\V1\Jobs\JobPostingController;
use App\Http\Controllers\Api\V1\Jobs\SkillController;
use App\Http\Controllers\Api\V1\Notifications\NotificationController;
use App\Http\Controllers\Api\V1\Offers\OfferController;
use App\Http\Controllers\Api\V1\Portal\CandidatePortalController;
use App\Http\Controllers\Api\V1\Portal\CandidateRegistrationController;
use App\Http\Controllers\Api\V1\Public\PublicApplicationController;
use App\Http\Controllers\Api\V1\Public\PublicCompanyController;
use App\Http\Controllers\Api\V1\Public\PublicJobController;
use App\Http\Controllers\Api\V1\Public\PublicOfferController;
use Illuminate\Support\Facades\Route;

/*
| HireFlow REST API, version 1 (prefix: /api/v1).
|
| Fortify registers these under /api/v1/auth (config/fortify.php):
|   POST register, login, logout, forgot-password, reset-password, two-factor-challenge,
|   user/confirm-password; PUT user/password; and the user/two-factor-* endpoints.
|
| Middleware for company-scoped routes: auth:sanctum → active → tenant
*/

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('health', HealthController::class)->name('health');

    // Public careers site.
    Route::prefix('public')->name('public.')->middleware('throttle:120,1')->group(function (): void {
        Route::get('jobs', [PublicJobController::class, 'index'])->name('jobs.index');
        Route::get('jobs/{slug}', [PublicJobController::class, 'show'])->name('jobs.show');
        Route::get('companies/{slug}', [PublicCompanyController::class, 'show'])->name('companies.show');
        Route::post('jobs/{slug}/apply', [PublicApplicationController::class, 'store'])
            ->middleware(['throttle:5,1', 'throttle:public-apply'])
            ->name('jobs.apply');
    });

    // Offer response link from the candidate's email.
    Route::prefix('public/offers/{token}')->name('public.offers.')->middleware('throttle:20,1')->group(function (): void {
        Route::get('/', [PublicOfferController::class, 'show'])->name('show');
        Route::post('accept', [PublicOfferController::class, 'accept'])->name('accept');
        Route::post('decline', [PublicOfferController::class, 'decline'])->name('decline');
    });

    // Candidate portal registration (sign-in uses the shared /auth/login).
    Route::post('candidate/register', CandidateRegistrationController::class)
        ->middleware('throttle:5,1')
        ->name('candidate.register');

    // Candidate portal: no company context; everything is limited to the user's own records.
    Route::prefix('candidate')->name('candidate.')->middleware(['auth:sanctum', 'active', 'candidate'])->group(function (): void {
        Route::get('applications', [CandidatePortalController::class, 'applications'])->name('applications');
        Route::get('applications/{id}', [CandidatePortalController::class, 'application'])->whereNumber('id')->name('applications.show');
        Route::get('offers', [CandidatePortalController::class, 'offers'])->name('offers');
        Route::post('offers/{id}/accept', [CandidatePortalController::class, 'acceptOffer'])->whereNumber('id')->name('offers.accept');
        Route::post('offers/{id}/decline', [CandidatePortalController::class, 'declineOffer'])->whereNumber('id')->name('offers.decline');
        Route::get('profile', [CandidatePortalController::class, 'profile'])->name('profile');
        Route::put('profile', [CandidatePortalController::class, 'updateProfile'])->name('profile.update');
        Route::get('documents', [CandidatePortalController::class, 'documents'])->name('documents');
        Route::post('documents', [CandidatePortalController::class, 'uploadDocument'])->middleware('throttle:10,1')->name('documents.store');
        Route::get('documents/{id}/download', [CandidatePortalController::class, 'downloadDocument'])->whereNumber('id')->name('documents.download');
    });

    // Public invitation preview and acceptance.
    Route::middleware('throttle:20,1')->group(function (): void {
        Route::get('invitations/{token}', [PublicInvitationController::class, 'show'])->name('invitations.show');
        Route::post('invitations/{token}/accept', [PublicInvitationController::class, 'accept'])->name('invitations.accept');
    });

    // Authenticated: works without a verified email or an active company.
    Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
        Route::get('auth/me', [CurrentUserController::class, 'show'])->middleware('tenant:optional')->name('auth.me');
        Route::put('auth/profile', [CurrentUserController::class, 'update'])->name('auth.profile');
        Route::get('auth/companies', [CurrentUserController::class, 'companies'])->name('auth.companies');
        Route::post('company/switch', [CurrentUserController::class, 'switchCompany'])->name('company.switch');
    });

    // Company-scoped API.
    Route::middleware(['auth:sanctum', 'active', 'tenant'])->group(function (): void {
        Route::get('company', [CompanyController::class, 'show'])->name('company.show');
        Route::put('company', [CompanyController::class, 'update'])->name('company.update');

        Route::get('company/members', [MemberController::class, 'index'])->name('company.members.index');
        Route::put('company/members/{id}/role', [MemberController::class, 'updateRole'])->whereNumber('id')->name('company.members.role');
        Route::delete('company/members/{id}', [MemberController::class, 'destroy'])->whereNumber('id')->name('company.members.destroy');
        Route::post('company/members/{id}/activate', [MemberController::class, 'activate'])->whereNumber('id')->name('company.members.activate');

        Route::get('company/invitations', [InvitationController::class, 'index'])->name('company.invitations.index');
        Route::post('company/invitations', [InvitationController::class, 'store'])->middleware('throttle:30,1')->name('company.invitations.store');
        Route::delete('company/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('company.invitations.destroy');
        Route::post('company/logo', [CompanyLogoController::class, 'store'])->name('company.logo.store');
        Route::delete('company/logo', [CompanyLogoController::class, 'destroy'])->name('company.logo.destroy');
        Route::get('company/recruiters', [AssignableUserController::class, 'recruiters'])->name('company.recruiters');
        Route::get('company/interviewers', [AssignableUserController::class, 'interviewers'])->name('company.interviewers');

        Route::apiResource('departments', DepartmentController::class)->except('show');
        Route::get('skills', [SkillController::class, 'index'])->name('skills.index');

        Route::apiResource('jobs', JobPostingController::class)->parameters(['jobs' => 'job']);
        Route::post('jobs/{job}/publish', [JobPostingController::class, 'publish'])->name('jobs.publish');
        Route::post('jobs/{job}/pause', [JobPostingController::class, 'pause'])->name('jobs.pause');
        Route::post('jobs/{job}/close', [JobPostingController::class, 'close'])->name('jobs.close');
        Route::post('jobs/{job}/archive', [JobPostingController::class, 'archive'])->name('jobs.archive');

        Route::apiResource('recruitment-stages', RecruitmentStageController::class)->except('show')->parameters(['recruitment-stages' => 'stage']);

        Route::get('tags', [TagController::class, 'index'])->name('tags.index');
        Route::get('candidates/duplicates', [CandidateController::class, 'duplicates'])->name('candidates.duplicates');
        Route::apiResource('candidates', CandidateController::class);
        Route::get('candidates/{candidate}/applications', [CandidateController::class, 'applications'])->name('candidates.applications');
        Route::get('candidates/{candidate}/notes', [CandidateNoteController::class, 'index'])->name('candidates.notes.index');
        Route::post('candidates/{candidate}/notes', [CandidateNoteController::class, 'store'])->name('candidates.notes.store');
        Route::post('candidates/{candidate}/documents', [CandidateDocumentController::class, 'store'])->middleware('throttle:30,1')->name('candidates.documents.store');
        Route::get('candidates/{candidate}/documents/{document}/download', [CandidateDocumentController::class, 'download'])->name('candidates.documents.download');
        Route::delete('candidates/{candidate}/documents/{document}', [CandidateDocumentController::class, 'destroy'])->name('candidates.documents.destroy');

        Route::get('applications/pipeline', [ApplicationController::class, 'pipeline'])->name('applications.pipeline');
        Route::get('applications', [ApplicationController::class, 'index'])->name('applications.index');
        Route::post('applications', [ApplicationController::class, 'store'])->name('applications.store');
        Route::get('applications/{application}', [ApplicationController::class, 'show'])->name('applications.show');
        Route::post('applications/{application}/stage', [ApplicationController::class, 'moveStage'])->name('applications.stage');
        Route::post('applications/{application}/assign', [ApplicationController::class, 'assign'])->name('applications.assign');
        Route::post('applications/{application}/reject', [ApplicationController::class, 'reject'])->name('applications.reject');
        Route::post('applications/{application}/reopen', [ApplicationController::class, 'reopen'])->name('applications.reopen');
        Route::get('applications/{application}/history', [ApplicationController::class, 'history'])->name('applications.history');
        Route::get('applications/{application}/notes', [ApplicationNoteController::class, 'index'])->name('applications.notes.index');

        Route::apiResource('interviews', InterviewController::class)->except('destroy');
        Route::post('interviews/{interview}/cancel', [InterviewController::class, 'cancel'])->name('interviews.cancel');
        Route::post('interviews/{interview}/complete', [InterviewController::class, 'complete'])->name('interviews.complete');
        Route::get('interviews/{interview}/feedback', [InterviewController::class, 'feedback'])->name('interviews.feedback.index');
        Route::post('interviews/{interview}/feedback', [InterviewController::class, 'submitFeedback'])->name('interviews.feedback.store');
        Route::get('interviews/{interview}/documents/{document}/download', [InterviewController::class, 'downloadDocument'])->name('interviews.documents.download');

        Route::apiResource('offers', OfferController::class)->except('destroy');
        foreach (['submit', 'approve', 'send', 'accept', 'reject', 'withdraw'] as $action) {
            Route::post("offers/{offer}/{$action}", [OfferController::class, $action])->name("offers.{$action}");
        }
        Route::post('offers/{offer}/return', [OfferController::class, 'returnToDraft'])->name('offers.return');
        Route::post('applications/{application}/notes', [ApplicationNoteController::class, 'store'])->name('applications.notes.store');

        Route::get('dashboard/overview', [DashboardController::class, 'overview'])->name('dashboard.overview');
        Route::get('dashboard/workspace', [DashboardController::class, 'workspace'])->name('dashboard.workspace');

        Route::get('analytics/applications', [AnalyticsController::class, 'applications'])->name('analytics.applications');
        Route::get('analytics/hiring-funnel', [AnalyticsController::class, 'hiringFunnel'])->name('analytics.hiring-funnel');
        Route::get('analytics/jobs', [AnalyticsController::class, 'jobs'])->name('analytics.jobs');
        Route::get('analytics/recruiters', [AnalyticsController::class, 'recruiters'])->name('analytics.recruiters');
        Route::get('analytics/time-to-hire', [AnalyticsController::class, 'timeToHire'])->name('analytics.time-to-hire');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
        Route::post('notifications/{id}/read', [NotificationController::class, 'read'])->whereUuid('id')->name('notifications.read');
    });
});
