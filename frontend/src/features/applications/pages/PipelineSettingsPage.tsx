import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table } from 'antd';
import type { TableProps } from 'antd';
import { useState } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { stageAccent } from '../components/stageColors';
import { toApiError } from '@/services/apiError';
import { useStageMutations, useStages } from '../queries';
import { STAGE_TYPE_LABELS, type Stage, type StageType } from '../types';

const CUSTOM_TYPES: StageType[] = ['screening', 'shortlist', 'interview', 'assessment', 'offer'];

export function PipelineSettingsPage() {
  const { message } = App.useApp();
  const stages = useStages();
  const { create, update, remove } = useStageMutations();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<StageType>('interview');
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const onError = (error: unknown) => void message.error(toApiError(error).message);
  const rows = stages.data ?? [];

  const moveBy = (stage: Stage, delta: number) =>
    update.mutate(
      { id: stage.id, name: stage.name, position: stage.position + delta },
      { onError },
    );

  const columns: TableProps<Stage>['columns'] = [
    {
      title: '#',
      dataIndex: 'position',
      width: 64,
      render: (position: number) => (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {position}
        </span>
      ),
    },
    {
      title: 'Stage',
      key: 'name',
      render: (_, s) => (
        <span className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${stageAccent(s.type).dot}`} />
          <span className="font-semibold text-slate-900">{s.name}</span>
          {s.is_system ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
              Fixed
            </span>
          ) : null}
        </span>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 140,
      render: (_, s) => <span className="text-slate-600">{STAGE_TYPE_LABELS[s.type]}</span>,
    },
    {
      title: 'Applications',
      dataIndex: 'applications_count',
      width: 120,
      align: 'center',
      render: (count: number | undefined) => (
        <span className="font-semibold text-slate-900 tabular-nums">{count ?? 0}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 260,
      align: 'right',
      render: (_, s) => {
        const index = rows.findIndex((r) => r.id === s.id);
        return (
          <Space>
            <Button size="small" onClick={() => setRenaming({ id: s.id, name: s.name })}>
              Rename
            </Button>
            {!s.is_system ? (
              <>
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  aria-label={`Move ${s.name} up`}
                  disabled={index <= 1}
                  onClick={() => moveBy(s, -1)}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  aria-label={`Move ${s.name} down`}
                  disabled={index >= rows.length - 2}
                  onClick={() => moveBy(s, 1)}
                />
                <Popconfirm
                  title={`Delete ${s.name}?`}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() =>
                    remove.mutate(s.id, {
                      onError,
                      onSuccess: () => void message.success('Stage deleted.'),
                    })
                  }
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Delete ${s.name}`}
                  />
                </Popconfirm>
              </>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Recruitment pipeline"
        description="Customise the stages candidates move through. Applied and Hired are fixed at the start and end."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            Add stage
          </Button>
        }
      />
      <div className="hf-surface overflow-hidden">
        {stages.isError ? (
          <ErrorState error={stages.error} onRetry={() => void stages.refetch()} />
        ) : (
          <Table<Stage>
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={stages.isPending || update.isPending}
            pagination={false}
          />
        )}
      </div>

      <Modal
        title="Add stage"
        open={adding}
        okText="Add"
        okButtonProps={{ disabled: name.trim().length < 2 }}
        confirmLoading={create.isPending}
        onCancel={() => setAdding(false)}
        onOk={() =>
          create.mutate(
            { name: name.trim(), type, position: Math.max(2, rows.length - 1) },
            {
              onSuccess: () => {
                setAdding(false);
                setName('');
                void message.success('Stage added before Hired.');
              },
              onError,
            },
          )
        }
        destroyOnHidden
      >
        <Form layout="vertical" component={false}>
          <Form.Item label="Name" htmlFor="stage-name" required>
            <Input
              id="stage-name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Item>
          <Form.Item
            label="Type"
            htmlFor="stage-type"
            extra="The type is used for reporting and business rules."
          >
            <Select<StageType>
              id="stage-type"
              value={type}
              onChange={setType}
              options={CUSTOM_TYPES.map((t) => ({ value: t, label: STAGE_TYPE_LABELS[t] }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Rename stage"
        open={renaming !== null}
        okText="Save"
        okButtonProps={{ disabled: (renaming?.name.trim().length ?? 0) < 2 }}
        confirmLoading={update.isPending}
        onCancel={() => setRenaming(null)}
        onOk={() =>
          renaming &&
          update.mutate(
            { id: renaming.id, name: renaming.name.trim() },
            { onSuccess: () => setRenaming(null), onError },
          )
        }
        destroyOnHidden
      >
        <Input
          aria-label="Stage name"
          maxLength={60}
          value={renaming?.name ?? ''}
          onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
        />
      </Modal>
    </>
  );
}
