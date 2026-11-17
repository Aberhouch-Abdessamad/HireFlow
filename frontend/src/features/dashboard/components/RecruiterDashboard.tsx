import { EnvironmentOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Link } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { stageAccent } from '@/features/applications/components/stageColors';
import { usePermissions } from '@/hooks/usePermission';
import { useWorkspace } from '../queries';
import type { Workspace } from '../types';
import { Block, MetricStrip, PanelSkeleton, Quiet, Row } from './kit';

const OFFER_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting approval',
  approved: 'Ready to send',
  sent: 'With candidate',
  accepted: 'Accepted',
  rejected: 'Declined',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

function dayLabel(date: dayjs.Dayjs): string {
  if (date.isSame(dayjs(), 'day')) return 'Today';
  if (date.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow';
  return date.format('dddd, MMM D');
}

/** Interviews grouped by day, as a simple agenda. */
function Agenda({ items }: { items: Workspace['agenda'] }) {
  const groups = new Map<string, Workspace['agenda']>();
  for (const item of items) {
    const key = dayjs(item.scheduled_at).format('YYYY-MM-DD');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div>
      {[...groups.entries()].map(([key, list]) => (
        <div key={key} className="border-t border-border first:border-t-0">
          <div className="bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-600">
            {dayLabel(dayjs(key))}
          </div>
          <ul className="m-0 list-none p-0">
            {list.map((item) => (
              <Row key={item.id} to={`/interviews/${item.id}`}>
                <span className="w-24 shrink-0 text-[13px] font-semibold text-slate-900 tabular-nums">
                  {dayjs(item.scheduled_at).format('HH:mm')}
                  <span className="font-normal text-slate-400">
                    {' '}
                    – {dayjs(item.ends_at).format('HH:mm')}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {item.candidate}
                  </span>
                  <span className="block truncate text-[13px] text-slate-500">
                    {item.type_label} · {item.job}
                  </span>
                </span>
                {item.meeting_url ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <VideoCameraOutlined /> Online
                  </span>
                ) : item.location ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <EnvironmentOutlined /> {item.location}
                  </span>
                ) : null}
              </Row>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Personal view for recruiters ("My work"): their candidates, interviews, feedback due,
 * stalled candidates, pipeline and jobs. Data comes from GET /dashboard/workspace, which the
 * API scopes to the signed-in member.
 */
export function RecruiterDashboard() {
  const { can } = usePermissions();
  const workspace = useWorkspace();

  if (workspace.isError) {
    return <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} />;
  }

  const w = workspace.data;
  const loading = workspace.isPending;
  const pipeline = w?.pipeline ?? [];
  const pipelineTotal = pipeline.reduce((sum, stage) => sum + stage.count, 0);
  const attention = [
    ...(w?.pending_feedback ?? []).map((item) => ({
      key: `f-${item.id}`,
      to: `/interviews/${item.id}`,
      dot: 'bg-rose-500',
      title: `Write feedback for ${item.candidate}`,
      meta: `${item.type_label} · ${dayjs(item.scheduled_at).format('MMM D')}`,
      cta: 'Write',
    })),
    ...(w?.needs_attention ?? []).map((item) => ({
      key: `s-${item.id}`,
      to: `/applications/${item.id}`,
      dot: 'bg-amber-500',
      title: `${item.candidate} has been in ${item.stage} for ${item.days_in_stage} days`,
      meta: item.job,
      cta: 'Move',
    })),
  ];
  const offers = Object.entries(w?.offers_by_status ?? {}).filter(([, count]) => count > 0);

  return (
    <div className="flex flex-col gap-10">
      <MetricStrip
        loading={loading}
        items={[
          {
            label: 'My candidates',
            value: w?.kpi.assigned_active ?? 0,
            hint: `${w?.kpi.new_this_week ?? 0} new this week`,
            to: '/applications?assigned_to=me&status=active',
          },
          {
            label: 'Interviews',
            value: w?.kpi.interviews_this_week ?? 0,
            hint: `${w?.kpi.interviews_today ?? 0} today · next 7 days`,
            to: '/interviews',
          },
          {
            label: 'Feedback due',
            value: w?.kpi.pending_feedback ?? 0,
            attention: (w?.kpi.pending_feedback ?? 0) > 0,
            hint: 'Interviews without your scorecard',
          },
          {
            label: 'Offers in progress',
            value: w?.kpi.offers_in_progress ?? 0,
            hint: 'Drafted by you, not yet closed',
            to: '/offers',
          },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        <Block
          title="Your agenda"
          description="Interviews you organise or sit on, next 7 days"
          action={
            can('interviews.view') ? { to: '/interviews/calendar', label: 'Calendar' } : undefined
          }
        >
          {loading ? (
            <PanelSkeleton rows={6} />
          ) : (w?.agenda ?? []).length === 0 ? (
            <Quiet>Your calendar is clear for the next 7 days.</Quiet>
          ) : (
            <Agenda items={w?.agenda ?? []} />
          )}
        </Block>

        <Block title="Needs your attention">
          {loading ? (
            <PanelSkeleton />
          ) : attention.length === 0 ? (
            <Quiet>Nothing is waiting on you. Every candidate moved this week.</Quiet>
          ) : (
            <ul className="m-0 list-none p-0">
              {attention.map((item) => (
                <Row key={item.key} to={item.to}>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                    <span className="block truncate text-[13px] text-slate-500">{item.meta}</span>
                  </span>
                  <span className="text-[13px] font-semibold text-primary">{item.cta}</span>
                </Row>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <Block
        title="My pipeline"
        description={`${pipelineTotal} active candidate${pipelineTotal === 1 ? '' : 's'} assigned to you`}
        action={{ to: '/applications/pipeline', label: 'Open board' }}
      >
        {loading ? (
          <PanelSkeleton rows={2} />
        ) : (
          <div className="px-5 py-5">
            {pipelineTotal > 0 ? (
              <div
                className="mb-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                aria-hidden="true"
              >
                {pipeline
                  .filter((stage) => stage.count > 0)
                  .map((stage) => (
                    <Tooltip key={stage.id} title={`${stage.name}: ${stage.count}`}>
                      <span
                        className={`h-full ${stageAccent(stage.type).dot}`}
                        style={{ width: `${(stage.count / pipelineTotal) * 100}%` }}
                      />
                    </Tooltip>
                  ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
              {pipeline.map((stage) => (
                <Link
                  key={stage.id}
                  to={`/applications?assigned_to=me&stage_id=${stage.id}`}
                  className="group !text-inherit !no-underline"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-primary">
                    <span className={`h-2 w-2 rounded-full ${stageAccent(stage.type).dot}`} />
                    <span className="truncate">{stage.name}</span>
                  </span>
                  <span className="mt-1 block text-2xl font-semibold text-slate-900 tabular-nums group-hover:text-primary">
                    {stage.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Block>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        <Block title="Jobs you recruit for" action={{ to: '/jobs', label: 'All jobs' }}>
          {loading ? (
            <PanelSkeleton />
          ) : (w?.jobs ?? []).length === 0 ? (
            <Quiet>No open jobs assigned to you yet.</Quiet>
          ) : (
            <ul className="m-0 list-none p-0">
              {(w?.jobs ?? []).map((job) => (
                <Row key={job.id} to={`/jobs/${job.id}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {job.title}
                      {job.status === 'paused' ? (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          Paused
                        </span>
                      ) : null}
                    </span>
                    {job.location ? (
                      <span className="block truncate text-[13px] text-slate-500">
                        {job.location}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right text-[13px] leading-tight">
                    <span className="block font-semibold text-slate-900 tabular-nums">
                      {job.active_applications} active
                    </span>
                    <span
                      className={`tabular-nums ${job.new_applications > 0 ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}
                    >
                      {job.new_applications > 0 ? `+${job.new_applications} new` : 'no new'}
                    </span>
                  </span>
                </Row>
              ))}
            </ul>
          )}
        </Block>

        <Block
          title="My offers"
          action={can('offers.view') ? { to: '/offers', label: 'All offers' } : undefined}
        >
          {loading ? (
            <PanelSkeleton rows={3} />
          ) : offers.length === 0 ? (
            <Quiet>You haven't drafted any offers yet.</Quiet>
          ) : (
            <ul className="m-0 list-none p-0">
              {offers.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between border-t border-border px-5 py-3.5 text-sm first:border-t-0"
                >
                  <span className="text-slate-700">{OFFER_LABELS[status] ?? status}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </div>
  );
}
