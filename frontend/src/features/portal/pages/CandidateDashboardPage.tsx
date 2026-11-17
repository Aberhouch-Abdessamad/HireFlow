import {
  CalendarOutlined,
  EnvironmentOutlined,
  RightOutlined,
  SolutionOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { CompanyLogo } from '@/features/careers/components/CompanyLogo';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/hooks/usePermission';
import { OfferCard } from '../components/OfferCard';
import { ProgressTag } from '../components/ProgressTag';
import { useMyApplications, useMyOffers } from '../queries';

export function CandidateDashboardPage() {
  const { user } = usePermissions();
  const applications = useMyApplications();
  const offers = useMyOffers();

  if (applications.isPending || offers.isPending) return <LoadingSkeleton rows={6} />;
  if (applications.isError)
    return <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />;

  const pendingOffers = (offers.data ?? []).filter((o) => o.status === 'sent');
  const interviews = applications.data
    .flatMap((a) =>
      (a.upcoming_interviews ?? []).map((i) => ({
        ...i,
        job: a.job.title,
        company: a.company.name,
      })),
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hello, ${user?.name.split(' ')[0] ?? ''}`}
        description="Here's where your applications stand."
      />

      {pendingOffers.length > 0 ? (
        <section>
          <h2 className="mt-0 mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
            Offers awaiting your answer
          </h2>
          <div className="flex flex-col gap-4">
            {pendingOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ) : null}

      <SectionCard title="Upcoming interviews" flush>
        {interviews.length === 0 ? (
          <EmptyState compact icon={<CalendarOutlined />} title="No interviews scheduled" />
        ) : (
          <ul className="m-0 list-none divide-y divide-border-soft p-0">
            {interviews.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft leading-none text-primary">
                  <span className="text-[10px] font-semibold uppercase">
                    {dayjs(i.scheduled_at).format('MMM')}
                  </span>
                  <span className="text-lg font-semibold">{dayjs(i.scheduled_at).format('D')}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    {i.type_label} · {dayjs(i.scheduled_at).format('dddd, HH:mm')}
                  </span>
                  <span className="block truncate text-[13px] text-slate-500">
                    {i.job} at {i.company} · {i.duration_minutes} min
                  </span>
                </span>
                {i.meeting_url ? (
                  <a
                    href={i.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold !text-white hover:bg-primary-hover"
                  >
                    <VideoCameraOutlined /> Join
                  </a>
                ) : i.location ? (
                  <span className="inline-flex items-center gap-1 text-[13px] text-slate-600">
                    <EnvironmentOutlined /> {i.location}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Your applications"
        extra={
          <Link to="/careers" className="text-[13px] font-medium">
            Browse jobs
          </Link>
        }
        flush
      >
        {applications.data.length === 0 ? (
          <EmptyState
            compact
            icon={<SolutionOutlined />}
            title="No applications yet"
            description="Applications sent with this email address appear here automatically."
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-border-soft p-0">
            {applications.data.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/candidate/applications/${a.id}`}
                  className="flex items-center gap-4 px-5 py-4 !text-inherit hover:bg-slate-50"
                >
                  <CompanyLogo name={a.company.name} logoUrl={a.company.logo_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {a.job.title}
                    </span>
                    <span className="block text-[13px] text-slate-500">
                      {a.company.name} · applied {dayjs(a.applied_at).format('MMM D, YYYY')}
                    </span>
                  </span>
                  <ProgressTag progress={a.progress} />
                  <RightOutlined className="text-xs text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
