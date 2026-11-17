import { App, Modal, Select } from 'antd';
import { useState } from 'react';
import { useCreateApplication } from '@/features/applications/queries';
import { useJobs } from '@/features/jobs/queries';
import { toApiError } from '@/services/apiError';

interface AddToJobModalProps {
  candidateId: number;
  excludeJobIds: number[];
  open: boolean;
  onClose: () => void;
}

/** Adds an existing candidate to an open job (creates an application in the first stage). */
export function AddToJobModal({ candidateId, excludeJobIds, open, onClose }: AddToJobModalProps) {
  const { message } = App.useApp();
  const [jobId, setJobId] = useState<number | undefined>();
  const jobs = useJobs({ page: 1, per_page: 100, status: 'published' });
  const create = useCreateApplication();

  const submit = () => {
    if (!jobId) return;
    create.mutate(
      { candidate_id: candidateId, job_id: jobId },
      {
        onSuccess: () => {
          void message.success('Candidate added to the job.');
          setJobId(undefined);
          onClose();
        },
        onError: (error) => void message.error(toApiError(error).message),
      },
    );
  };

  return (
    <Modal
      title="Add to job"
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Add"
      okButtonProps={{ disabled: !jobId }}
      confirmLoading={create.isPending}
    >
      <Select<number>
        aria-label="Job"
        className="w-full"
        showSearch={{ optionFilterProp: 'label' }}
        placeholder="Choose a published job"
        loading={jobs.isPending}
        value={jobId}
        onChange={setJobId}
        options={(jobs.data?.data ?? [])
          .filter((job) => !excludeJobIds.includes(job.id))
          .map((job) => ({ value: job.id, label: job.title }))}
      />
    </Modal>
  );
}
