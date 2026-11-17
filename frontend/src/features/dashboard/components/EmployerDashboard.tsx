import { VideoCameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColors } from '@/app/theme';
import { ErrorState } from '@/components/ErrorState';
import { UserAvatar } from '@/components/UserAvatar';
import { useApplications } from '@/features/applications/queries';
import { useInterviews } from '@/features/interviews/queries';
import { useOffers } from '@/features/offers/queries';
import { usePermissions } from '@/hooks/usePermission';
import { formatMoney } from '@/utils/format';
import {
  useApplicationsSeries,
  useDashboardOverview,
  useHiringFunnel,
  useRecruiterPerformance,
} from '../queries';
import type { PeriodParams } from '../types';
import { ChartLegend, ChartTooltip } from './ChartTooltip';
import { axisProps, monthLabel } from './chartStyles';
import { Block, MetricStrip, PanelSkeleton, Quiet, Row } from './kit';

const SERIES = [
  { key: 'applications', label: 'Applications', color: chartColors[0] },
  { key: 'hired', label: 'Hired', color: chartColors[2] },
  { key: 'rejected', label: 'Rejected', color: chartColors[1] },
] as const;

const FUNNEL_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  shortlist: 'Shortlisted',
  interview: 'Interview',
  assessment: 'Assessment',
  offer: 'Offer',
  hired: 'Hired',
};

const num = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined ? '—' : Number(value).toFixed(digits);

/**
 * Company-wide view for Company Admins and HR Managers: headline figures, one trend chart,
 * what needs a decision, what's coming up, funnel conversion and team activity.
 */
export function EmployerDashboard({ params }: { params: PeriodParams }) {
  const { can } = usePermissions();
  const now = useMemo(() => dayjs().startOf('minute').toISOString(), []);

  const overview = useDashboardOverview(params);
  const series = useApplicationsSeries(params);
  const funnel = useHiringFunnel(params);
  const recruiters = useRecruiterPerformance(params);
  const approvals = useOffers(
    { page: 1, per_page: 4, status: 'pending_approval' },
    can('offers.view'),
  );
  const upcoming = useInterviews(
    { status: 'scheduled', from: now, per_page: 5 },
    can('interviews.view'),
  );
  const unassigned = useApplications({
    page: 1,
    per_page: 1,
    status: 'active',
    assigned_to: 'none',
  });

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const kpi = overview.data?.kpi;
  const seriesData = (series.data ?? []).map((row) => ({ ...row, label: monthLabel(row.month) }));
  const periodTotal = seriesData.reduce((sum, row) => sum + row.applications, 0);
  const funnelRows = (funnel.data?.funnel ?? []).filter((row) => row.stage_type in FUNNEL_LABELS);
  const top = Math.max(1, funnelRows[0]?.applications ?? 1);
  const team = [...(recruiters.data ?? [])]
    .filter((row) => row.assigned + row.hired + row.interviews_scheduled + row.offers_created > 0)
    .sort((a, b) => b.hired - a.hired || b.assigned - a.assigned)
    .slice(0, 5);
  const approvalCount = approvals.data?.meta.total ?? 0;
  const unassignedCount = unassigned.data?.meta.total ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <MetricStrip
        loading={overview.isPending}
        items={[
          {
            label: 'Open jobs',
            value: num(kpi?.active_jobs),
            hint: 'Published and accepting applicants',
            to: '/jobs?status=published',
          },
          {
            label: 'Applications',
            value: num(kpi?.total_applications),
            hint: `${num(kpi?.total_candidates)} people in your talent pool`,
            to: '/applications',
          },
          {
            label: 'Interviews ahead',
            value: num(kpi?.scheduled_interviews),
            hint: 'Scheduled from today',
            to: '/interviews',
          },
          {
            label: 'Hires',
            value: num(kpi?.candidates_hired),
            hint:
              kpi?.conversion_rate == null
                ? 'No applications this period'
                : `${num(kpi.conversion_rate, 1)}% of applicants this period`,
          },
        ]}
      />

      <Block
        title="Applications"
        description={
          series.isPending
            ? 'Loading…'
            : `${periodTotal} in the months shown · avg. time to hire ${
                kpi?.avg_time_to_hire_days == null
                  ? '—'
                  : `${num(kpi.avg_time_to_hire_days, 1)} days`
              } · rejection rate ${kpi?.rejection_rate == null ? '—' : `${num(kpi.rejection_rate, 1)}%`}`
        }
        extra={<ChartLegend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />}
      >
        <div className="px-3 pt-5 pb-2">
          {series.isPending ? (
            <div className="h-[280px] animate-pulse rounded-lg bg-slate-50" />
          ) : seriesData.length === 0 ? (
            <Quiet>No applications in this period.</Quiet>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={seriesData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="emp-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EFEDEB" />
                <XAxis dataKey="label" {...axisProps} padding={{ left: 16, right: 16 }} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#D4D2D0', strokeDasharray: '4 4' }}
                />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={s.key === 'applications' ? 'url(#emp-area)' : 'transparent'}
                    dot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Block>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Block title="Needs your attention">
          {approvals.isPending && can('offers.view') ? (
            <PanelSkeleton />
          ) : (
            <ul className="m-0 list-none p-0">
              {(approvals.data?.data ?? []).map((offer) => (
                <Row key={offer.id} to={`/offers/${offer.id}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      Approve offer for {offer.application?.candidate.full_name}
                    </span>
                    <span className="block truncate text-[13px] text-slate-500">
                      {offer.application?.job.title} ·{' '}
                      {formatMoney(offer.salary_amount, offer.currency)} a year
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold text-primary">Review</span>
                </Row>
              ))}
              {unassignedCount > 0 ? (
                <Row to="/applications?assigned_to=none&status=active">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {unassignedCount} active application{unassignedCount === 1 ? '' : 's'} without
                      an owner
                    </span>
                    <span className="block text-[13px] text-slate-500">
                      Assign a recruiter so nobody falls through the cracks
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold text-primary">Assign</span>
                </Row>
              ) : null}
              {approvalCount > (approvals.data?.data.length ?? 0) ? (
                <Row to="/offers?status=pending_approval">
                  <span className="flex-1 text-[13px] text-slate-600">
                    {approvalCount - (approvals.data?.data.length ?? 0)} more offers waiting
                  </span>
                </Row>
              ) : null}
              {approvalCount === 0 && unassignedCount === 0 ? (
                <li>
                  <Quiet>You're all caught up. Nothing is waiting on you.</Quiet>
                </li>
              ) : null}
            </ul>
          )}
        </Block>

        <Block title="Coming up" action={{ to: '/interviews/calendar', label: 'Calendar' }}>
          {upcoming.isPending ? (
            <PanelSkeleton />
          ) : (upcoming.data?.data ?? []).length === 0 ? (
            <Quiet>No interviews scheduled.</Quiet>
          ) : (
            <ul className="m-0 list-none p-0">
              {(upcoming.data?.data ?? []).map((interview) => (
                <Row key={interview.id} to={`/interviews/${interview.id}`}>
                  <span className="w-14 shrink-0 text-[13px] leading-tight">
                    <span className="block font-semibold text-slate-900">
                      {dayjs(interview.scheduled_at).format('ddd D')}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {dayjs(interview.scheduled_at).format('HH:mm')}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {interview.application?.candidate.full_name}
                    </span>
                    <span className="block truncate text-[13px] text-slate-500">
                      {interview.type_label} · {interview.application?.job.title}
                    </span>
                  </span>
                  {interview.meeting_url ? (
                    <VideoCameraOutlined className="text-slate-400" aria-label="Online" />
                  ) : null}
                </Row>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Block
          title="Hiring funnel"
          description="Share of applicants who reached each stage"
          action={can('analytics.view') ? { to: '/analytics', label: 'Analytics' } : undefined}
        >
          {funnel.isPending ? (
            <PanelSkeleton rows={6} />
          ) : funnelRows.length === 0 ? (
            <Quiet>No funnel data yet.</Quiet>
          ) : (
            <ul className="m-0 list-none px-5 py-4">
              {funnelRows.map((row) => {
                const share = (row.applications / top) * 100;
                return (
                  <li
                    key={row.stage_type}
                    className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-4 py-2 text-[13px]"
                  >
                    <span className="font-medium text-slate-700">
                      {FUNNEL_LABELS[row.stage_type]}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${row.applications > 0 ? Math.max(1.5, share) : 0}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{row.applications}</span>
                      <span className="ml-1.5 text-slate-400">{Math.round(share)}%</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>

        <Block title="Team" description="Recruiters active in this period">
          {recruiters.isPending ? (
            <PanelSkeleton rows={5} />
          ) : team.length === 0 ? (
            <Quiet>No recruiter activity in this period.</Quiet>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-5 pt-4 pb-2 font-medium">Recruiter</th>
                  <th className="px-3 pt-4 pb-2 text-right font-medium">Assigned</th>
                  <th className="px-3 pt-4 pb-2 text-right font-medium">Interviews</th>
                  <th className="px-3 pt-4 pb-2 text-right font-medium">Offers</th>
                  <th className="px-5 pt-4 pb-2 text-right font-medium">Hires</th>
                </tr>
              </thead>
              <tbody>
                {team.map((row) => (
                  <tr key={row.user_id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5 font-medium text-slate-900">
                        <UserAvatar name={row.name} size="xs" />
                        <span className="truncate">{row.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                      {row.assigned}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                      {row.interviews_scheduled}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                      {row.offers_created}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      {row.hired}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>
      </div>
    </div>
  );
}
