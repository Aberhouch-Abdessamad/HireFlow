import { Input, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CandidateCard } from '@/components/CandidateCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { useJobs } from '@/features/jobs/queries';
import { toOptions } from '@/features/jobs/types';
import { formatDate } from '@/utils/format';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { stageAccent } from '../components/stageColors';
import { useApplications, useStages } from '../queries';
import {
  APPLICATION_STATUS_LABELS,
  SOURCE_LABELS,
  type Application,
  type ApplicationStatus,
} from '../types';

export function ApplicationsListPage() {
  const [params, setParams] = useSearchParams();
  const jobs = useJobs({ page: 1, per_page: 100, sort: 'title' });
  const stages = useStages();

  const page = Number(params.get('page') ?? '1') || 1;
  const search = params.get('search') ?? '';
  const jobId = params.get('job_id') ? Number(params.get('job_id')) : undefined;
  const stageId = params.get('stage_id') ? Number(params.get('stage_id')) : undefined;
  const status = (params.get('status') as ApplicationStatus | null) ?? undefined;
  const assigned = params.get('assigned_to') ?? undefined;
  const [searchInput, setSearchInput] = useState(search);

  const applications = useApplications({
    page,
    per_page: 20,
    search: search || undefined,
    job_id: jobId,
    stage_id: stageId,
    status,
    assigned_to: assigned,
  });

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const columns: TableProps<Application>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_, a) => (
        <Link to={`/applications/${a.id}`} className="!text-inherit">
          <CandidateCard
            size="small"
            name={a.candidate?.full_name ?? '—'}
            subtitle={a.candidate?.email}
          />
        </Link>
      ),
    },
    {
      title: 'Job',
      key: 'job',
      render: (_, a) =>
        a.job ? (
          <Link
            to={`/jobs/${a.job.id}`}
            className="font-medium !text-slate-700 hover:!text-primary"
          >
            {a.job.title}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      title: 'Stage',
      key: 'stage',
      width: 160,
      render: (_, a) =>
        a.stage ? (
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <span className={`h-2 w-2 rounded-full ${stageAccent(a.stage.type).dot}`} />
            {a.stage.name}
          </span>
        ) : null,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, a) => <ApplicationStatusBadge status={a.status} />,
    },
    {
      title: 'Owner',
      key: 'assignee',
      width: 160,
      render: (_, a) =>
        a.assignee ? (
          <span className="flex items-center gap-2 text-[13px]">
            <UserAvatar name={a.assignee.name} size="xs" />
            <span className="truncate">{a.assignee.name}</span>
          </span>
        ) : (
          <span className="text-[13px] text-slate-400">Unassigned</span>
        ),
    },
    {
      title: 'Source',
      key: 'source',
      width: 130,
      render: (_, a) => (
        <span className="whitespace-nowrap text-slate-600">{SOURCE_LABELS[a.source]}</span>
      ),
    },
    {
      title: 'Applied',
      key: 'applied_at',
      width: 120,
      render: (_, a) => (
        <span className="whitespace-nowrap text-slate-600">{formatDate(a.applied_at)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Applications"
        description="Every candidate application across your jobs."
      />
      <div className="hf-surface overflow-hidden">
        <div className="hf-toolbar">
          <Input.Search
            allowClear
            aria-label="Search applications"
            placeholder="Candidate name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={(value) => update({ search: value.trim() || undefined })}
            style={{ width: 240 }}
          />
          <Select<number>
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            aria-label="Filter by job"
            placeholder="All jobs"
            style={{ width: 220 }}
            value={jobId}
            options={(jobs.data?.data ?? []).map((j) => ({ value: j.id, label: j.title }))}
            onChange={(value) => update({ job_id: value })}
          />
          <Select<number>
            allowClear
            aria-label="Filter by stage"
            placeholder="All stages"
            style={{ width: 160 }}
            value={stageId}
            options={(stages.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            onChange={(value) => update({ stage_id: value })}
          />
          <Select<ApplicationStatus>
            allowClear
            aria-label="Filter by status"
            placeholder="All statuses"
            style={{ width: 140 }}
            value={status}
            options={toOptions(APPLICATION_STATUS_LABELS)}
            onChange={(value) => update({ status: value })}
          />
          <Select
            allowClear
            aria-label="Filter by assignee"
            placeholder="Anyone"
            style={{ width: 150 }}
            value={assigned}
            options={[
              { value: 'me', label: 'Assigned to me' },
              { value: 'none', label: 'Unassigned' },
            ]}
            onChange={(value: string | undefined) => update({ assigned_to: value })}
          />
        </div>
        {applications.isError ? (
          <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />
        ) : (
          <Table<Application>
            rowKey="id"
            columns={columns}
            dataSource={applications.data?.data ?? []}
            loading={applications.isFetching}
            scroll={{ x: 1180 }}
            locale={{
              emptyText: <EmptyState compact title="No applications match your filters." />,
            }}
            pagination={{
              current: page,
              pageSize: 20,
              total: applications.data?.meta.total ?? 0,
              showSizeChanger: false,
              onChange: (next) => update({ page: next }),
            }}
          />
        )}
      </div>
    </>
  );
}
