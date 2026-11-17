import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Segmented, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AvatarStack } from '@/components/AvatarStack';
import { Can } from '@/components/Can';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/utils/format';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { useDepartments, useJobs } from '../queries';
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  WORK_MODE_LABELS,
  toOptions,
  type EmploymentType,
  type JobPosting,
  type JobStatus,
} from '../types';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'expires_at', label: 'Closing soonest' },
];

/** List filters live in the URL so views can be shared and survive reloads. */
export function JobsListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const departments = useDepartments();

  const page = Number(params.get('page') ?? '1') || 1;
  const perPage = Number(params.get('per_page') ?? '15') || 15;
  const search = params.get('search') ?? '';
  const status = (params.get('status') as JobStatus | null) ?? undefined;
  const departmentId = params.get('department_id')
    ? Number(params.get('department_id'))
    : undefined;
  const employmentType = (params.get('employment_type') as EmploymentType | null) ?? undefined;
  const sort = params.get('sort') ?? '-created_at';
  const [searchInput, setSearchInput] = useState(search);

  const jobs = useJobs({
    page,
    per_page: perPage,
    search: search || undefined,
    status,
    department_id: departmentId,
    employment_type: employmentType,
    sort,
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

  const hasFilters = Boolean(search || status || departmentId || employmentType);

  const columns: TableProps<JobPosting>['columns'] = [
    {
      title: 'Job',
      key: 'title',
      render: (_, job) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary"
          >
            {job.title.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <Link
              to={`/jobs/${job.id}`}
              className="font-semibold !text-slate-900 hover:!text-primary"
            >
              {job.title}
            </Link>
            <div className="mt-0.5 text-[13px] text-slate-500">
              {[job.location, WORK_MODE_LABELS[job.work_mode]].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      width: 160,
      render: (_, job) => job.department?.name ?? '—',
    },
    {
      title: 'Type',
      key: 'type',
      width: 130,
      render: (_, job) => EMPLOYMENT_TYPE_LABELS[job.employment_type],
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, job) => <JobStatusBadge status={job.status} />,
    },
    {
      title: 'Recruiters',
      key: 'recruiters',
      width: 180,
      render: (_, job) => <AvatarStack people={job.recruiters ?? []} />,
    },
    {
      title: 'Closes',
      key: 'expires_at',
      width: 130,
      render: (_, job) => <span className="text-slate-600">{formatDate(job.expires_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Jobs"
        description="Create, publish and track your open positions."
        actions={
          <Can permission="jobs.create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => void navigate('/jobs/create')}
            >
              Create job
            </Button>
          </Can>
        }
      />
      <div className="hf-surface overflow-hidden">
        <div className="hf-toolbar justify-between">
          <Segmented
            aria-label="Filter by status"
            value={status ?? 'all'}
            options={[{ value: 'all', label: 'All' }, ...toOptions(JOB_STATUS_LABELS)]}
            onChange={(value) => update({ status: value === 'all' ? undefined : String(value) })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input.Search
              allowClear
              aria-label="Search jobs"
              placeholder="Search title or location"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onSearch={(value) => update({ search: value.trim() || undefined })}
              style={{ width: 240 }}
            />
            <Select<number>
              allowClear
              aria-label="Filter by department"
              placeholder="All departments"
              style={{ width: 180 }}
              value={departmentId}
              loading={departments.isPending}
              options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
              onChange={(value) => update({ department_id: value })}
            />
            <Select<EmploymentType>
              allowClear
              aria-label="Filter by employment type"
              placeholder="All types"
              style={{ width: 150 }}
              value={employmentType}
              options={toOptions(EMPLOYMENT_TYPE_LABELS)}
              onChange={(value) => update({ employment_type: value })}
            />
            <Select
              aria-label="Sort jobs"
              style={{ width: 170 }}
              value={sort}
              options={SORT_OPTIONS}
              onChange={(value: string) =>
                update({ sort: value === '-created_at' ? undefined : value })
              }
            />
          </div>
        </div>

        {jobs.isError ? (
          <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
        ) : jobs.isSuccess && jobs.data.meta.total === 0 && !hasFilters ? (
          <EmptyState
            title="No jobs yet"
            description="Create your first job posting to start receiving applications."
            action={
              <Can permission="jobs.create">
                <Button type="primary" onClick={() => void navigate('/jobs/create')}>
                  Create job
                </Button>
              </Can>
            }
          />
        ) : (
          <Table<JobPosting>
            rowKey="id"
            columns={columns}
            dataSource={jobs.data?.data ?? []}
            loading={jobs.isFetching}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <EmptyState
                  compact
                  title="No matching jobs"
                  description="Try a different search or clear the filters."
                />
              ),
            }}
            onRow={(job) => ({
              onClick: (event) => {
                if ((event.target as HTMLElement).closest('a,button')) return;
                void navigate(`/jobs/${job.id}`);
              },
              className: 'cursor-pointer',
            })}
            pagination={{
              current: page,
              pageSize: perPage,
              total: jobs.data?.meta.total ?? 0,
              showSizeChanger: true,
              onChange: (nextPage, nextSize) =>
                update({
                  page: nextSize !== perPage ? undefined : nextPage,
                  per_page: nextSize === 15 ? undefined : nextSize,
                }),
            }}
          />
        )}
      </div>
    </>
  );
}
