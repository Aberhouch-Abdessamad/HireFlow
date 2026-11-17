import { App, Result } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { JobForm } from '../components/JobForm';
import { useJob, useSaveJob } from '../queries';
import { jobToFormValues } from '../schemas';

export function JobEditPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const job = useJob(id);
  const save = useSaveJob();

  if (job.isPending) return <LoadingSkeleton rows={8} />;
  if (job.isError) return <ErrorState error={job.error} onRetry={() => void job.refetch()} />;
  if (!job.data.is_editable) {
    return (
      <Result
        status="warning"
        title="This job can't be edited"
        subTitle="Archived jobs are read-only."
      />
    );
  }

  return (
    <>
      <PageHeader
        back={{ to: `/jobs/${id}`, label: job.data.title }}
        title="Edit job"
        description={job.data.title}
      />
      <JobForm
        key={job.data.updated_at}
        defaultValues={jobToFormValues(job.data, (value) => dayjs(value))}
        submitLabel="Save changes"
        onCancel={() => void navigate(`/jobs/${id}`)}
        onSubmit={async (payload) => {
          await save.mutateAsync({ id, payload });
          void message.success('Job updated.');
          await navigate(`/jobs/${id}`);
        }}
      />
    </>
  );
}
