import { App, Select } from 'antd';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { useJobs } from '@/features/jobs/queries';
import { usePermission } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { PipelineBoard } from '../components/PipelineBoard';
import { useMoveApplication, usePipeline } from '../queries';

export function PipelinePage() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job_id') ? Number(params.get('job_id')) : undefined;
  const jobs = useJobs({ page: 1, per_page: 100, sort: 'title' });
  const pipeline = usePipeline(jobId);
  const move = useMoveApplication(jobId);
  const canMove = usePermission('applications.update_stage');

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Pipeline"
        description="Drag candidates between stages, or use the card menu."
        actions={
          <>
            <Select<number>
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              aria-label="Filter by job"
              placeholder="All jobs"
              style={{ width: 280 }}
              value={jobId}
              loading={jobs.isPending}
              options={(jobs.data?.data ?? [])
                .filter((j) => j.status !== 'archived')
                .map((j) => ({ value: j.id, label: j.title }))}
              onChange={(value) =>
                setParams(value ? { job_id: String(value) } : {}, { replace: true })
              }
            />
          </>
        }
      />
      {pipeline.isPending ? (
        <LoadingSkeleton variant="cards" />
      ) : pipeline.isError ? (
        <ErrorState error={pipeline.error} onRetry={() => void pipeline.refetch()} />
      ) : (
        <PipelineBoard
          columns={pipeline.data}
          canMove={canMove}
          showJob={!jobId}
          onMove={(application, stageId) =>
            move.mutate(
              { id: application.id, stageId },
              { onError: (error) => void message.error(toApiError(error).message) },
            )
          }
        />
      )}
    </>
  );
}
