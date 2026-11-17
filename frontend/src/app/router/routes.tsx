import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { SystemStatusPage } from '@/features/system/pages/SystemStatusPage';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { CandidateLayout } from '@/layouts/CandidateLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import type { Permission } from '@/types/permissions';
import { CandidateRoute } from './CandidateRoute';
import { GuestRoute } from './GuestRoute';
import { HomeRedirect } from './HomeRedirect';
import { lazyPage } from './lazyPage';
import { NotFoundPage } from './NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequirePermission } from './RequirePermission';

const auth = () => import('@/features/auth/pages');
const company = () => import('@/features/company/pages');
const jobs = () => import('@/features/jobs/pages');
const careers = () => import('@/features/careers/pages');
const candidates = () => import('@/features/candidates/pages');
const applications = () => import('@/features/applications/pages');
const interviews = () => import('@/features/interviews/pages');
const offers = () => import('@/features/offers/pages');
const portal = () => import('@/features/portal/pages');
const dashboard = () => import('@/features/dashboard/pages');

const LoginPage = lazyPage(auth, 'LoginPage');
const RegisterPage = lazyPage(auth, 'RegisterPage');
const ForgotPasswordPage = lazyPage(auth, 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(auth, 'ResetPasswordPage');
const TwoFactorChallengePage = lazyPage(auth, 'TwoFactorChallengePage');
const ProfilePage = lazyPage(auth, 'ProfilePage');
const MembersPage = lazyPage(company, 'MembersPage');
const CompanyProfilePage = lazyPage(company, 'CompanyProfilePage');
const AcceptInvitationPage = lazyPage(company, 'AcceptInvitationPage');
const JobsListPage = lazyPage(jobs, 'JobsListPage');
const JobCreatePage = lazyPage(jobs, 'JobCreatePage');
const JobEditPage = lazyPage(jobs, 'JobEditPage');
const JobDetailPage = lazyPage(jobs, 'JobDetailPage');
const DepartmentsPage = lazyPage(jobs, 'DepartmentsPage');
const CareersPage = lazyPage(careers, 'CareersPage');
const CareerJobPage = lazyPage(careers, 'CareerJobPage');
const CandidatesListPage = lazyPage(candidates, 'CandidatesListPage');
const CandidateDetailPage = lazyPage(candidates, 'CandidateDetailPage');
const ApplicationsListPage = lazyPage(applications, 'ApplicationsListPage');
const ApplicationDetailPage = lazyPage(applications, 'ApplicationDetailPage');
const PipelinePage = lazyPage(applications, 'PipelinePage');
const PipelineSettingsPage = lazyPage(applications, 'PipelineSettingsPage');
const InterviewsListPage = lazyPage(interviews, 'InterviewsListPage');
const InterviewCalendarPage = lazyPage(interviews, 'InterviewCalendarPage');
const InterviewDetailPage = lazyPage(interviews, 'InterviewDetailPage');
const OffersListPage = lazyPage(offers, 'OffersListPage');
const OfferDetailPage = lazyPage(offers, 'OfferDetailPage');
const OfferResponsePage = lazyPage(offers, 'OfferResponsePage');
const CandidateLoginPage = lazyPage(portal, 'CandidateLoginPage');
const CandidateRegisterPage = lazyPage(portal, 'CandidateRegisterPage');
const CandidateDashboardPage = lazyPage(portal, 'CandidateDashboardPage');
const CandidateApplicationsPage = lazyPage(portal, 'CandidateApplicationsPage');
const CandidateApplicationPage = lazyPage(portal, 'CandidateApplicationPage');
const CandidateDocumentsPage = lazyPage(portal, 'CandidateDocumentsPage');
const CandidateProfilePage = lazyPage(portal, 'CandidateProfilePage');
const DashboardPage = lazyPage(dashboard, 'DashboardPage');
const AnalyticsPage = lazyPage(dashboard, 'AnalyticsPage');

function guarded(permission: Permission, element: ReactNode) {
  return <RequirePermission permission={permission}>{element}</RequirePermission>;
}

export const routes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'dashboard', element: guarded('analytics.view', <DashboardPage />) },
          { path: 'analytics', element: guarded('analytics.view', <AnalyticsPage />) },
          { path: 'jobs', element: guarded('jobs.view', <JobsListPage />) },
          { path: 'jobs/create', element: guarded('jobs.create', <JobCreatePage />) },
          { path: 'jobs/:id', element: guarded('jobs.view', <JobDetailPage />) },
          { path: 'jobs/:id/edit', element: guarded('jobs.update', <JobEditPage />) },
          { path: 'candidates', element: guarded('candidates.view', <CandidatesListPage />) },
          { path: 'candidates/:id', element: guarded('candidates.view', <CandidateDetailPage />) },
          { path: 'applications', element: guarded('applications.view', <ApplicationsListPage />) },
          {
            path: 'applications/pipeline',
            element: guarded('applications.view', <PipelinePage />),
          },
          {
            path: 'applications/:id',
            element: guarded('applications.view', <ApplicationDetailPage />),
          },
          { path: 'interviews', element: guarded('interviews.view', <InterviewsListPage />) },
          {
            path: 'interviews/calendar',
            element: guarded('interviews.view', <InterviewCalendarPage />),
          },
          { path: 'interviews/:id', element: guarded('interviews.view', <InterviewDetailPage />) },
          { path: 'offers', element: guarded('offers.view', <OffersListPage />) },
          { path: 'offers/:id', element: guarded('offers.view', <OfferDetailPage />) },
          { path: 'company/members', element: guarded('users.manage', <MembersPage />) },
          { path: 'company/profile', element: guarded('company.settings', <CompanyProfilePage />) },
          {
            path: 'company/departments',
            element: guarded('company.settings', <DepartmentsPage />),
          },
          {
            path: 'company/pipeline',
            element: guarded('company.settings', <PipelineSettingsPage />),
          },
        ],
      },
    ],
  },
  {
    element: <CandidateRoute />,
    children: [
      {
        element: <CandidateLayout />,
        children: [
          { path: 'candidate/dashboard', element: <CandidateDashboardPage /> },
          { path: 'candidate/applications', element: <CandidateApplicationsPage /> },
          { path: 'candidate/applications/:id', element: <CandidateApplicationPage /> },
          { path: 'candidate/documents', element: <CandidateDocumentsPage /> },
          { path: 'candidate/profile', element: <CandidateProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'reset-password', element: <ResetPasswordPage /> },
          { path: 'two-factor-challenge', element: <TwoFactorChallengePage /> },
          { path: 'candidate/login', element: <CandidateLoginPage /> },
          { path: 'candidate/register', element: <CandidateRegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <PublicLayout />,
    children: [
      { path: 'status', element: <SystemStatusPage /> },
      { path: 'careers', element: <CareersPage /> },
      { path: 'careers/jobs/:slug', element: <CareerJobPage /> },
      { path: 'invitations/:token', element: <AcceptInvitationPage /> },
      { path: 'offers/respond/:token', element: <OfferResponsePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
