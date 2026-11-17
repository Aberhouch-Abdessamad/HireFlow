import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { App, Button, Popconfirm } from 'antd';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { UserAvatar } from '@/components/UserAvatar';
import { usePermissions } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { formatDate, formatSalary } from '@/utils/format';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { useDeleteJob, useJob, useJobTransition } from '../queries';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  TRANSITION_FOR_STATUS,
  WORK_MODE_LABELS,
  type JobStatus,
} from '../types';

const TRANSITION_UI: Record<
  string,
  { label: string; done: string; primary?: boolean; danger?: boolean; confirm?: string }
> = {
  published: { label: 'Publish', done: 'Job published.', primary: true },
  paused: { label: 'Pause', done: 'Job paused.' },
  closed: {
    label: 'Close',
    done: 'Job closed.',
    danger: true,
    confirm: 'Close this job? It will stop accepting applications.',
  },
  archived: {
    label: 'Archive',
    done: 'Job archived.',
    confirm: 'Archive this job? Archived jobs are read-only.',
  },
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function SkillChip({ name, required }: { name: string; required: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset ${
        required
          ? 'bg-primary-soft text-indigo-700 ring-indigo-200'
          : 'bg-white text-slate-600 ring-slate-200'
      }`}
    >
      {name}
    </span>
  );
}

export function JobDetailPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const { can } = usePermissions();
  const job = useJob(id);
  const transition = useJobTransition();
  const remove = useDeleteJob();

  if (job.isPending) return <LoadingSkeleton rows={8} />;
  if (job.isError) return <ErrorState error={job.error} onRetry={() => void job.refetch()} />;

  const data = job.data;
  const onError = (error: unknown) => void message.error(toApiError(error).message);

  const runTransition = (target: JobStatus) => {
    const action = TRANSITION_FOR_STATUS[target];
    if (!action) return;
    transition.mutate(
      { id, transition: action },
      {
        onSuccess: () => void message.success(TRANSITION_UI[target]?.done ?? 'Job updated.'),
        onError,
      },
    );
  };

  const statusButtons = can('jobs.publish')
    ? data.available_transitions.map((target) => {
        const ui = TRANSITION_UI[target];
        if (!ui) return null;
        const button = (
          <Button
            key={target}
            type={ui.primary ? 'primary' : 'default'}
            danger={ui.danger}
            loading={
              transition.isPending &&
              transition.variables.transition === TRANSITION_FOR_STATUS[target]
            }
            onClick={ui.confirm ? undefined : () => runTransition(target)}
          >
            {data.status === 'closed' && target === 'published' ? 'Reopen' : ui.label}
          </Button>
        );
        return ui.confirm ? (
          <Popconfirm key={target} title={ui.confirm} onConfirm={() => runTransition(target)}>
            {button}
          </Popconfirm>
        ) : (
          button
        );
      })
    : [];

  const salary = formatSalary(data.salary);
  const publicUrl = `/careers/jobs/${data.slug}`;
  const required = (data.skills ?? []).filter((skill) => skill.is_required);
  const preferred = (data.skills ?? []).filter((skill) => !skill.is_required);

  return (
    <>
      <PageHeader
        back={{ to: '/jobs', label: 'All jobs' }}
        title={data.title}
        meta={
          <>
            <JobStatusBadge status={data.status} />
            {[
              data.department?.name,
              EMPLOYMENT_TYPE_LABELS[data.employment_type],
              EXPERIENCE_LEVEL_LABELS[data.experience_level],
            ]
              .filter(Boolean)
              .map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            <span className="inline-flex items-center gap-1 text-[13px] text-slate-500">
              <EnvironmentOutlined />
              {[data.location, WORK_MODE_LABELS[data.work_mode]].filter(Boolean).join(' · ')}
            </span>
          </>
        }
        actions={
          <>
            {statusButtons}
            {can('jobs.update') && data.is_editable ? (
              <Button icon={<EditOutlined />} onClick={() => void navigate(`/jobs/${id}/edit`)}>
                Edit
              </Button>
            ) : null}
            {can('jobs.delete') && data.is_deletable ? (
              <Popconfirm
                title="Delete this job?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() =>
                  remove.mutate(id, {
                    onSuccess: () => {
                      void message.success('Job deleted.');
                      void navigate('/jobs');
                    },
                    onError,
                  })
                }
              >
                <Button danger icon={<DeleteOutlined />} aria-label="Delete">
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="About the role">
            <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
              {data.description}
            </p>
          </SectionCard>
          {data.requirements ? (
            <SectionCard title="Requirements">
              <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
                {data.requirements}
              </p>
            </SectionCard>
          ) : null}
          <SectionCard title="Skills" description="Required skills are highlighted.">
            {required.length + preferred.length === 0 ? (
              <span className="text-sm text-slate-500">No skills listed.</span>
            ) : (
              <div className="flex flex-col gap-4">
                {required.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Required
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {required.map((skill) => (
                        <SkillChip key={skill.id} name={skill.name} required />
                      ))}
                    </div>
                  </div>
                ) : null}
                {preferred.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Nice to have
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {preferred.map((skill) => (
                        <SkillChip key={skill.id} name={skill.name} required={false} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-[84px]">
          {can('applications.view') ? (
            <Link
              to={`/applications?job_id=${id}`}
              className="hf-surface hf-link-card flex items-center gap-3 p-4 !text-inherit"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-lg text-primary">
                <SolutionOutlined />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  View applications
                </span>
                <span className="block text-xs text-slate-500">
                  Candidates who applied to this job
                </span>
              </span>
            </Link>
          ) : null}

          <SectionCard title="Details">
            <dl className="m-0 -my-2.5 divide-y divide-border-soft">
              <DetailRow label="Employment">
                {EMPLOYMENT_TYPE_LABELS[data.employment_type]}
              </DetailRow>
              <DetailRow label="Experience">
                {EXPERIENCE_LEVEL_LABELS[data.experience_level]}
              </DetailRow>
              <DetailRow label="Salary">
                {salary ?? 'Not specified'}
                {salary && !data.salary.visible ? (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                    Hidden
                  </span>
                ) : null}
              </DetailRow>
              <DetailRow label="Published">{formatDate(data.published_at)}</DetailRow>
              <DetailRow label="Closes">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarOutlined className="text-slate-400" />
                  {formatDate(data.expires_at, 'No end date')}
                </span>
              </DetailRow>
              {data.closed_at ? (
                <DetailRow label="Closed">{formatDate(data.closed_at)}</DetailRow>
              ) : null}
              <DetailRow label="Created by">{data.created_by ?? '—'}</DetailRow>
            </dl>
            {data.status === 'published' ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-[13px] font-medium hover:border-indigo-200 hover:bg-primary-soft"
              >
                <ExportOutlined /> View on careers page
              </a>
            ) : null}
          </SectionCard>

          <SectionCard title="Hiring team">
            {data.recruiters && data.recruiters.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.recruiters.map((recruiter) => (
                  <li key={recruiter.id} className="flex items-center gap-3">
                    <UserAvatar name={recruiter.name} size="sm" />
                    <div className="leading-tight">
                      <div className="text-sm font-medium text-slate-900">{recruiter.name}</div>
                      <div className="text-xs text-slate-500">Recruiter</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-slate-500">No recruiters assigned.</span>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
