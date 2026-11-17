import { App } from 'antd';
import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { JobForm } from '../components/JobForm';
import { useSaveJob } from '../queries';
import { emptyJobForm } from '../schemas';

export function JobCreatePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const save = useSaveJob();

  return (
    <>
      <PageHeader
        back={{ to: '/jobs', label: 'All jobs' }}
        title="Create job"
        description="Jobs are saved as drafts. Publish when you're ready."
      />
      <JobForm
        defaultValues={emptyJobForm}
        submitLabel="Save draft"
        onCancel={() => void navigate('/jobs')}
        onSubmit={async (payload) => {
          const job = await save.mutateAsync({ payload });
          void message.success('Job saved as a draft.');
          await navigate(`/jobs/${job.id}`);
        }}
      />
    </>
  );
}
