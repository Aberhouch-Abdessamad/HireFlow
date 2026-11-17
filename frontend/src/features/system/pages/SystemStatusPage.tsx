import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Tag } from 'antd';
import dayjs from 'dayjs';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { useCsrfCheck, useHealth } from '../queries';

function StatusTag({ ok, label }: { ok: boolean; label: string }) {
  return <Tag color={ok ? 'success' : 'error'}>{label}</Tag>;
}

/** Shows live API health and the Sanctum CSRF handshake (used for environment smoke tests). */
export function SystemStatusPage() {
  const health = useHealth();
  const csrf = useCsrfCheck();

  const refresh = () => {
    void health.refetch();
    void csrf.refetch();
  };

  return (
    <>
      <PageHeader
        title="System status"
        description="Live connectivity between this application and the HireFlow API."
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={refresh}
            loading={health.isFetching || csrf.isFetching}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="API">
          {health.isPending ? (
            <LoadingSkeleton rows={3} />
          ) : health.isError ? (
            <ErrorState error={health.error} onRetry={() => void health.refetch()} />
          ) : (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <StatusTag ok={health.data.status === 'ok'} label={health.data.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Database">
                <StatusTag
                  ok={health.data.checks.database === 'ok'}
                  label={health.data.checks.database}
                />
              </Descriptions.Item>
              <Descriptions.Item label="API version">{health.data.api_version}</Descriptions.Item>
              <Descriptions.Item label="Server time">
                {dayjs(health.data.server_time).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Card title="Session security">
          {csrf.isPending ? (
            <LoadingSkeleton rows={1} />
          ) : csrf.isError ? (
            <ErrorState error={csrf.error} onRetry={() => void csrf.refetch()} />
          ) : (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="CSRF cookie">
                <StatusTag ok={csrf.data} label={csrf.data ? 'received' : 'missing'} />
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </div>
    </>
  );
}
