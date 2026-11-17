import { EnvironmentOutlined, ExportOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import { Link } from 'react-router';
import {
  EXPERIENCE_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from '@/features/jobs/types';
import { formatSalary } from '@/utils/format';
import { usePublicJob } from '../queries';
import { CompanyLogo } from './CompanyLogo';

/** Right-hand job details pane on the careers page (wide screens). */
export function JobPreview({ slug }: { slug: string }) {
  const job = usePublicJob(slug);

  if (job.isPending) {
    return (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }
  if (job.isError) {
    return (
      <div className="p-6 text-sm text-slate-600">
        This position is no longer available. <Link to="/careers">Browse open positions</Link>
      </div>
    );
  }

  const data = job.data;
  const salary = formatSalary(data.salary);

  return (
    <article className="flex h-full flex-col">
      <header className="border-b border-border px-6 pt-6 pb-5 shadow-[0_2px_4px_rgb(0_0_0/0.04)]">
        <div className="flex items-start gap-3">
          <CompanyLogo name={data.company.name} logoUrl={data.company.logo_url} />
          <div className="min-w-0">
            <h2 className="m-0 text-[22px] leading-tight font-bold text-slate-900">{data.title}</h2>
            <Link
              to={`/careers?company=${encodeURIComponent(data.company.slug)}`}
              className="mt-1 inline-block text-[15px] font-bold !text-primary"
            >
              {data.company.name}
            </Link>
            {data.location ? (
              <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
                <EnvironmentOutlined className="text-xs" /> {data.location}
              </div>
            ) : null}
            {salary ? (
              <div className="mt-1 text-sm font-bold text-slate-800">
                {salary} a year · {EMPLOYMENT_TYPE_LABELS[data.employment_type]}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/careers/jobs/${data.slug}#apply`}>
            <Button type="primary" size="large">
              Apply now
            </Button>
          </Link>
          <Link to={`/careers/jobs/${data.slug}`}>
            <Button size="large" icon={<ExportOutlined />}>
              Open full page
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h3 className="mt-0 mb-3 text-lg font-bold text-slate-900">Job details</h3>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Job type', EMPLOYMENT_TYPE_LABELS[data.employment_type]],
            ['Work mode', WORK_MODE_LABELS[data.work_mode]],
            ['Experience', EXPERIENCE_LEVEL_LABELS[data.experience_level]],
            ['Pay', salary ? `${salary} a year` : 'Not specified'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-bold text-slate-900">{label}</dt>
              <dd className="m-0 mt-0.5 text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>

        {data.skills.length > 0 ? (
          <>
            <hr className="my-5 border-0 border-t border-border" />
            <h3 className="mt-0 mb-3 text-lg font-bold text-slate-900">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((skill) => (
                <span
                  key={skill.name}
                  className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
                >
                  {skill.name}
                  {skill.is_required ? ' · required' : ''}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <hr className="my-5 border-0 border-t border-border" />
        <h3 className="mt-0 mb-3 text-lg font-bold text-slate-900">Full job description</h3>
        <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-800">
          {data.description}
        </p>
        {data.requirements ? (
          <>
            <h4 className="mt-5 mb-2 text-[15px] font-bold text-slate-900">
              What we're looking for
            </h4>
            <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-800">
              {data.requirements}
            </p>
          </>
        ) : null}
      </div>
    </article>
  );
}
