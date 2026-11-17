import { DownloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, List, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { FileUploader } from '@/components/FileUploader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { toApiError } from '@/services/apiError';
import { formatDate } from '@/utils/format';
import { downloadMyDocument } from '../api';
import { useMyApplications, useMyDocuments, useUploadMyDocument } from '../queries';

export function CandidateDocumentsPage() {
  const { message } = App.useApp();
  const documents = useMyDocuments();
  const applications = useMyApplications();
  const upload = useUploadMyDocument();
  const [applicationId, setApplicationId] = useState<number | undefined>();

  if (documents.isPending) return <LoadingSkeleton rows={4} />;
  if (documents.isError)
    return <ErrorState error={documents.error} onRetry={() => void documents.refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <Card title="Share an updated CV">
        <Typography.Paragraph type="secondary">
          Choose the application to send your updated CV to. Only that company receives it.
        </Typography.Paragraph>
        <Space wrap>
          <Select<number>
            aria-label="Application"
            style={{ minWidth: 280 }}
            placeholder="Choose an application"
            value={applicationId}
            onChange={setApplicationId}
            options={(applications.data ?? []).map((a) => ({
              value: a.id,
              label: `${a.job.title} · ${a.company.name}`,
            }))}
          />
          <FileUploader
            accept=".pdf,.docx"
            mimeTypes={[
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ]}
            maxSizeMb={5}
            label="Upload CV"
            disabled={!applicationId}
            onUpload={async (file) => {
              if (!applicationId) return;
              await upload.mutateAsync({ applicationId, file });
              void message.success('CV shared.');
            }}
          />
        </Space>
      </Card>
      <Card title="Your documents">
        {documents.data.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents yet" />
        ) : (
          <List
            dataSource={documents.data}
            renderItem={(d) => (
              <List.Item
                key={d.id}
                actions={[
                  <Button
                    key="dl"
                    type="text"
                    icon={<DownloadOutlined />}
                    aria-label={`Download ${d.original_name}`}
                    onClick={() =>
                      void downloadMyDocument(d).catch(
                        (e: unknown) => void message.error(toApiError(e).message),
                      )
                    }
                  />,
                ]}
              >
                <List.Item.Meta
                  title={d.original_name}
                  description={`${d.company} · ${formatDate(d.created_at)}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
