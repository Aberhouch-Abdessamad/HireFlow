import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import { Grid, Pagination, Select, Skeleton } from 'antd';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  toOptions,
  type EmploymentType,
  type WorkMode,
} from '@/features/jobs/types';
import { CompanyLogo } from '../components/CompanyLogo';
import { JobCard } from '../components/JobCard';
import { JobPreview } from '../components/JobPreview';
import { usePublicCompany, usePublicJobs } from '../queries';

/**
 * Public job board: a "What / Where" search, filter pills and, on wide screens, a
 * results list with a job preview pane beside it. One company only with ?company=slug.
 */
export function CareersPage() {
  const [params, setParams] = useSearchParams();
  const screens = Grid.useBreakpoint();
  const company = params.get('company') ?? undefined;
  const search = params.get('search') ?? '';
  const location = params.get('location') ?? '';
  const employmentType = (params.get('employment_type') as EmploymentType | null) ?? undefined;
  const workMode = (params.get('work_mode') as WorkMode | null) ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;
  const [what, setWhat] = useState(search);
  const [where, setWhere] = useState(location);
  const [picked, setPicked] = useState<string | null>(null);

  const companyProfile = usePublicCompany(company);
  const jobs = usePublicJobs({
    page,
    search: search || undefined,
    location: location || undefined,
    company,
    employment_type: employmentType,
    work_mode: workMode,
  });

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
    setPicked(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ search: what.trim() || undefined, location: where.trim() || undefined });
  };

  const results = jobs.data?.data ?? [];
  const split = Boolean(screens.lg);
  const selected = split ? (picked ?? results[0]?.slug ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      {company && companyProfile.data ? (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 sm:flex-row sm:items-center">
          <CompanyLogo
            name={companyProfile.data.name}
            logoUrl={companyProfile.data.logo_url}
            size="xl"
          />
          <div className="min-w-0">
            <h1 className="m-0 text-[28px] font-bold text-slate-900">
              {companyProfile.data.name} jobs
            </h1>
            <p className="mt-1 mb-0 text-[15px] text-slate-600">
              {[
                companyProfile.data.industry,
                `${companyProfile.data.open_jobs_count} open position${companyProfile.data.open_jobs_count === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {companyProfile.data.description ? (
              <p className="mt-3 mb-0 line-clamp-3 max-w-3xl text-sm leading-relaxed text-slate-700">
                {companyProfile.data.description}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <form
        onSubmit={submit}
        role="search"
        className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_2px_8px_rgb(0_0_0/0.08)] md:flex-row md:items-stretch"
      >
        <label className="flex flex-1 items-center gap-3 px-4 py-3">
          <span className="text-sm font-bold text-slate-900">What</span>
          <input
            aria-label="Job title or keywords"
            className="w-full border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
            placeholder="Job title or keywords"
            value={what}
            onChange={(event) => setWhat(event.target.value)}
          />
          <SearchOutlined className="text-slate-500" />
        </label>
        <span aria-hidden="true" className="mx-0 my-0 h-px bg-border md:my-3 md:h-auto md:w-px" />
        <label className="flex flex-1 items-center gap-3 px-4 py-3">
          <span className="text-sm font-bold text-slate-900">Where</span>
          <input
            aria-label="City or region"
            className="w-full border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
            placeholder="City or region"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
          />
          <EnvironmentOutlined className="text-slate-500" />
        </label>
        <div className="p-2">
          <button
            type="submit"
            className="h-full w-full cursor-pointer rounded-lg border-0 bg-primary px-6 py-3 text-[15px] font-bold text-white hover:bg-primary-hover md:w-auto"
          >
            Find jobs
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Select<EmploymentType>
          allowClear
          aria-label="Job type"
          placeholder="Job type"
          variant="filled"
          popupMatchSelectWidth={false}
          className="min-w-[140px]"
          value={employmentType}
          options={toOptions(EMPLOYMENT_TYPE_LABELS)}
          onChange={(value) => update({ employment_type: value })}
        />
        <Select<WorkMode>
          allowClear
          aria-label="Work mode"
          placeholder="Remote / on-site"
          variant="filled"
          popupMatchSelectWidth={false}
          className="min-w-[160px]"
          value={workMode}
          options={toOptions(WORK_MODE_LABELS)}
          onChange={(value) => update({ work_mode: value })}
        />
        {jobs.data ? (
          <span className="ml-auto text-sm text-slate-600">
            {search ? (
              <>
                <span className="font-bold text-slate-900">{search}</span> jobs
                {location ? ` in ${location}` : ''} ·{' '}
              </>
            ) : null}
            {jobs.data.meta.total} job{jobs.data.meta.total === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {jobs.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : jobs.isError ? (
        <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-border bg-white">
          <EmptyState
            icon={<SearchOutlined />}
            title="No jobs match your search"
            description="Try a different job title, place or filter."
          />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-3">
            {results.map((job) => (
              <JobCard
                key={job.slug}
                job={job}
                showCompany={!company}
                selected={selected === job.slug}
                onSelect={split ? setPicked : undefined}
              />
            ))}
            {jobs.data.meta.last_page > 1 ? (
              <Pagination
                className="mt-2 self-center"
                current={page}
                pageSize={jobs.data.meta.per_page}
                total={jobs.data.meta.total}
                showSizeChanger={false}
                onChange={(next) => update({ page: next })}
              />
            ) : null}
          </div>
          {split && selected ? (
            <aside className="sticky top-[84px] h-[calc(100vh-110px)] overflow-hidden rounded-xl border border-border bg-white">
              <JobPreview key={selected} slug={selected} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
