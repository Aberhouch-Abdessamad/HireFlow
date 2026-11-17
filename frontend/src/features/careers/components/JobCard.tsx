import { EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router';
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '@/features/jobs/types';
import { formatSalary } from '@/utils/format';
import type { PublicJob } from '../types';

dayjs.extend(relativeTime);

interface JobCardProps {
  job: PublicJob;
  showCompany?: boolean;
  /** Highlighted as the job shown in the preview pane. */
  selected?: boolean;
  /** When set, clicking selects the job instead of opening its page (wide screens). */
  onSelect?: (slug: string) => void;
}

/** Job-board result card: bold title, company, location and grey attribute chips. */
export function JobCard({ job, showCompany = true, selected = false, onSelect }: JobCardProps) {
  const salary = formatSalary(job.salary);
  const isNew = job.published_at ? dayjs().diff(dayjs(job.published_at), 'day') <= 3 : false;

  const body = (
    <>
      {isNew ? (
        <span className="mb-1.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
          New
        </span>
      ) : null}
      <h3 className="m-0 text-[17px] leading-snug font-bold text-slate-900 group-hover:underline">
        {job.title}
      </h3>
      {showCompany ? (
        <div className="mt-1 text-sm text-slate-800">{job.company.name}</div>
      ) : job.department ? (
        <div className="mt-1 text-sm text-slate-800">{job.department}</div>
      ) : null}
      {job.location ? (
        <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
          <EnvironmentOutlined className="text-xs" /> {job.location}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {salary ? (
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
            {salary} a year
          </span>
        ) : null}
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {EMPLOYMENT_TYPE_LABELS[job.employment_type]}
        </span>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {WORK_MODE_LABELS[job.work_mode]}
        </span>
      </div>
      {job.published_at ? (
        <div className="mt-3 text-xs text-slate-500">
          Posted {dayjs(job.published_at).fromNow()}
        </div>
      ) : null}
    </>
  );

  const className = `group block w-full cursor-pointer rounded-xl border bg-white p-5 text-left transition-shadow hover:shadow-[var(--shadow-lift)] ${
    selected ? 'border-primary shadow-[inset_4px_0_0_var(--color-primary)]' : 'border-border'
  }`;

  return onSelect ? (
    <button
      type="button"
      aria-pressed={selected}
      className={className}
      onClick={() => onSelect(job.slug)}
    >
      {body}
    </button>
  ) : (
    <Link to={`/careers/jobs/${job.slug}`} className={`${className} !text-inherit !no-underline`}>
      {body}
    </Link>
  );
}
