import { Avatar, Card, Empty, List, Steps, Typography } from 'antd';
import dayjs from 'dayjs';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { toApiError } from '@/services/apiError';
import { ProgressTag } from '../components/ProgressTag';
import { useMyApplication, useMyApplications } from '../queries';
import { PROGRESS_LABELS, PROGRESS_STEPS } from '../types';

export function CandidateApplicationsPage() {
  const applications = useMyApplications();

  if (applications.isPending) return <LoadingSkeleton rows={6} />;
  if (applications.isError)
    return <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />;

  return (
    <Card title="Applications">
      {applications.data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No applications yet" />
      ) : (
        <List
          dataSource={applications.data}
          renderItem={(a) => (
            <List.Item key={a.id} extra={<ProgressTag progress={a.progress} />}>
              <List.Item.Meta
                avatar={
                  <Avatar
                    shape="square"
                    src={a.company.logo_url ?? undefined}
                    className="bg-primary"
                  >
                    {a.company.name.charAt(0)}
                  </Avatar>
                }
                title={<Link to={`/candidate/applications/${a.id}`}>{a.job.title}</Link>}
                description={`${a.company.name} · applied ${dayjs(a.applied_at).format('MMM D, YYYY')}`}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}

export function CandidateApplicationPage() {
  const id = Number(useParams().id);
  const application = useMyApplication(id);

  if (application.isPending) return <LoadingSkeleton rows={6} />;
  if (application.isError) {
    return toApiError(application.error).isNotFound ? (
      <Empty description="Application not found" />
    ) : (
      <ErrorState error={application.error} />
    );
  }

  const a = application.data;
  const closed = a.progress === 'not_selected' || a.progress === 'withdrawn';
  const current = PROGRESS_STEPS.indexOf(a.progress);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {a.job.title}
        </Typography.Title>
        <Typography.Text type="secondary">
          {a.company.name} · applied {dayjs(a.applied_at).format('MMMM D, YYYY')}
        </Typography.Text>
      </div>
      <Card>
        {closed ? (
          <Typography.Paragraph className="mb-0">
            <ProgressTag progress={a.progress} />{' '}
            {a.progress === 'not_selected'
              ? `Thank you for your interest in ${a.company.name}. The team decided not to move forward with your application.`
              : 'This application was withdrawn.'}
          </Typography.Paragraph>
        ) : (
          <Steps
            current={current}
            items={PROGRESS_STEPS.map((step) => ({ title: PROGRESS_LABELS[step] }))}
            responsive
          />
        )}
      </Card>
      {(a.upcoming_interviews ?? []).length > 0 ? (
        <Card title="Upcoming interviews">
          <List
            dataSource={a.upcoming_interviews}
            renderItem={(i) => (
              <List.Item
                key={i.id}
                extra={
                  i.meeting_url ? (
                    <a href={i.meeting_url} target="_blank" rel="noopener noreferrer">
                      Join
                    </a>
                  ) : (
                    i.location
                  )
                }
              >
                <List.Item.Meta
                  title={dayjs(i.scheduled_at).format('dddd, MMM D · HH:mm')}
                  description={`${i.type_label} · ${i.duration_minutes} min`}
                />
              </List.Item>
            )}
          />
        </Card>
      ) : null}
      <Link to={`/careers/jobs/${a.job.slug}`}>View the job posting</Link>
    </div>
  );
}
