import { CheckCircleFilled, EnvironmentOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Segmented, Switch, Table } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AvatarStack } from '@/components/AvatarStack';
import { CandidateCard } from '@/components/CandidateCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { usePermission } from '@/hooks/usePermission';
import { InterviewStatusBadge } from '../components/InterviewStatusBadge';
import { InterviewViewSwitch } from '../components/InterviewViewSwitch';
import { useInterviews } from '../queries';
import type { Interview } from '../types';

type View = 'upcoming' | 'past' | 'cancelled';

export function InterviewsListPage() {
  const isScheduler = usePermission('interviews.schedule');
  const [view, setView] = useState<View>('upcoming');
  const [mine, setMine] = useState(!isScheduler);
  const [page, setPage] = useState(1);
  const now = useMemo(() => dayjs().startOf('minute').toISOString(), []);

  const params =
    view === 'upcoming'
      ? { status: 'scheduled' as const, from: now }
      : view === 'past'
        ? { to: now }
        : { status: 'cancelled' as const };
  const interviews = useInterviews({ ...params, mine, page, per_page: 20 });

  const columns: TableProps<Interview>['columns'] = [
    {
      title: 'When',
      key: 'when',
      width: 200,
      render: (_, i) => (
        <Link to={`/interviews/${i.id}`} className="flex items-center gap-3 !text-inherit">
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft leading-none text-primary">
            <span className="text-[10px] font-semibold uppercase">
              {dayjs(i.scheduled_at).format('MMM')}
            </span>
            <span className="text-base font-semibold">{dayjs(i.scheduled_at).format('D')}</span>
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-slate-900">
              {dayjs(i.scheduled_at).format('dddd')}
            </span>
            <span className="text-[13px] text-slate-500">
              {dayjs(i.scheduled_at).format('HH:mm')} – {dayjs(i.ends_at).format('HH:mm')}
            </span>
          </span>
        </Link>
      ),
    },
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_, i) => (
        <CandidateCard
          size="small"
          name={i.application?.candidate.full_name ?? ''}
          subtitle={i.application?.job.title}
        />
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type_label',
      width: 170,
      render: (label: string) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700">
          {label}
        </span>
      ),
    },
    {
      title: 'Interviewers',
      key: 'participants',
      render: (_, i) => {
        const people = i.participants ?? [];
        const done = people.filter((p) => p.has_submitted_feedback).length;
        return (
          <span className="flex items-center gap-2.5">
            <AvatarStack people={people} />
            {people.length > 1 && done > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircleFilled /> {done}/{people.length}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: 'Where',
      key: 'where',
      width: 110,
      render: (_, i) =>
        i.meeting_url ? (
          <a
            href={i.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold"
          >
            <VideoCameraOutlined /> Join
          </a>
        ) : i.location ? (
          <span className="inline-flex items-center gap-1 text-[13px] text-slate-600">
            <EnvironmentOutlined /> {i.location}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, i) => <InterviewStatusBadge status={i.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Interviews"
        description={
          isScheduler ? 'All interviews in your company.' : 'Interviews you are part of.'
        }
        actions={<InterviewViewSwitch value="list" />}
      />
      <div className="hf-surface overflow-hidden">
        <div className="hf-toolbar">
          <Segmented<View>
            value={view}
            onChange={(v) => {
              setView(v);
              setPage(1);
            }}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          {isScheduler ? (
            <span className="ml-auto flex items-center gap-2 text-[13px] text-slate-600">
              <Switch
                size="small"
                id="only-mine"
                checked={mine}
                onChange={(v) => {
                  setMine(v);
                  setPage(1);
                }}
              />
              <label htmlFor="only-mine">Only my interviews</label>
            </span>
          ) : null}
        </div>
        {interviews.isError ? (
          <ErrorState error={interviews.error} onRetry={() => void interviews.refetch()} />
        ) : (
          <Table<Interview>
            rowKey="id"
            columns={columns}
            dataSource={interviews.data?.data ?? []}
            loading={interviews.isFetching}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <EmptyState
                  compact
                  title={view === 'upcoming' ? 'No upcoming interviews' : 'Nothing here'}
                  description={
                    view === 'upcoming'
                      ? 'Schedule interviews from an application page.'
                      : undefined
                  }
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize: 20,
              total: interviews.data?.meta.total ?? 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
          />
        )}
      </div>
    </>
  );
}
