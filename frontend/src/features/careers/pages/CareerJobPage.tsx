import { ArrowLeftOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Button, Result, Skeleton } from 'antd';
import { SectionCard } from '@/components/SectionCard';
import { Link, useParams } from 'react-router';
import {
  EXPERIENCE_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from '@/features/jobs/types';
import { toApiError } from '@/services/apiError';
import { formatDate, formatSalary } from '@/utils/format';
import { ApplyForm } from '../components/ApplyForm';
import { CompanyLogo } from '../components/CompanyLogo';
import { usePublicJob } from '../queries';

export function CareerJobPage() {
  const { slug = '' } = useParams();
  const job = usePublicJob(slug);

  if (job.isPending) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (job.isError) {
    const notFound = toApiError(job.error).isNotFound;
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'This position is no longer available' : 'Something went wrong'}
        extra={<Link to="/careers">Browse open positions</Link>}
      />
    );
  }

  const data = job.data;
  const salary = formatSalary(data.salary);

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/careers?company=${encodeURIComponent(data.company.slug)}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium !text-slate-500 hover:!text-primary"
      >
        <ArrowLeftOutlined className="text-[11px]" /> All jobs at {data.company.name}
      </Link>

      <section className="hf-surface flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-5">
          <CompanyLogo name={data.company.name} logoUrl={data.company.logo_url} size="lg" />
          <div>
            <h1 className="m-0 text-[28px] leading-tight font-semibold tracking-tight text-slate-900">
              {data.title}
            </h1>
            <div className="mt-1 text-sm text-slate-500">
              {[data.company.name, data.department].filter(Boolean).join(' · ')}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {data.location ? (
                <span className="inline-flex items-center gap-1 text-[13px] text-slate-600">
                  <EnvironmentOutlined /> {data.location}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                {WORK_MODE_LABELS[data.work_mode]}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                {EMPLOYMENT_TYPE_LABELS[data.employment_type]}
              </span>
              {salary ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                  {salary} / year
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <a href="#apply" className="shrink-0">
          <Button type="primary" size="large">
            Apply now
          </Button>
        </a>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="About the role">
            <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
              {data.description}
            </p>
          </SectionCard>
          {data.requirements ? (
            <SectionCard title="What we're looking for">
              <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
                {data.requirements}
              </p>
            </SectionCard>
          ) : null}
          <ApplyForm slug={data.slug} companyName={data.company.name} />
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-[84px]">
          <SectionCard title="Overview">
            <dl className="m-0 -my-2 divide-y divide-border-soft text-[13px]">
              {[
                ['Experience', EXPERIENCE_LEVEL_LABELS[data.experience_level]],
                ['Employment', EMPLOYMENT_TYPE_LABELS[data.employment_type]],
                salary ? ['Salary', `${salary} / year`] : null,
                ['Posted', formatDate(data.published_at)],
                data.expires_at ? ['Apply by', formatDate(data.expires_at)] : null,
              ]
                .filter((row): row is string[] => row !== null)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="m-0 text-right font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
            </dl>
          </SectionCard>
          {data.skills.length > 0 ? (
            <SectionCard title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className={`rounded-lg px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset ${
                      skill.is_required
                        ? 'bg-primary-soft text-indigo-700 ring-indigo-200'
                        : 'bg-white text-slate-600 ring-slate-200'
                    }`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
