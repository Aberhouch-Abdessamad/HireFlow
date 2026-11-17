import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Modal, Popconfirm } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FormInput } from '@/components/form/FormInput';
import { PageHeader } from '@/components/PageHeader';
import { toApiError } from '@/services/apiError';
import { applyApiErrors } from '@/utils/forms';
import { useDeleteDepartment, useDepartments, useSaveDepartment } from '../queries';
import type { Department } from '../types';

const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  description: z.string().trim().max(500),
});
type DepartmentValues = z.infer<typeof departmentSchema>;

function DepartmentModal({
  department,
  open,
  onClose,
}: {
  department: Department | null;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const save = useSaveDepartment();
  const { control, handleSubmit, setError } = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    values: { name: department?.name ?? '', description: department?.description ?? '' },
  });

  const onSubmit = async (values: DepartmentValues) => {
    try {
      await save.mutateAsync({
        id: department?.id,
        payload: { name: values.name, description: values.description || null },
      });
      void message.success(department ? 'Department updated.' : 'Department created.');
      onClose();
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, ['name', 'description']);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <Modal
      title={department ? 'Edit department' : 'New department'}
      open={open}
      onOk={() => void handleSubmit(onSubmit)()}
      okText="Save"
      confirmLoading={save.isPending}
      onCancel={onClose}
      destroyOnHidden
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <Form layout="vertical" component={false}>
          <FormInput control={control} name="name" label="Name" required autoFocus />
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Description"
                htmlFor="department-description"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input.TextArea
                  id="department-description"
                  rows={3}
                  maxLength={500}
                  showCount
                  {...field}
                />
              </Form.Item>
            )}
          />
        </Form>
      </form>
    </Modal>
  );
}

export function DepartmentsPage() {
  const { message } = App.useApp();
  const departments = useDepartments();
  const remove = useDeleteDepartment();
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);

  const openModal = (department: Department | null) => {
    setEditing(department);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Departments"
        description="Organise jobs and reports by department."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            New department
          </Button>
        }
      />
      <div>
        {departments.isError ? (
          <ErrorState error={departments.error} onRetry={() => void departments.refetch()} />
        ) : departments.isSuccess && departments.data.length === 0 ? (
          <div className="hf-surface">
            <EmptyState
              title="No departments yet"
              description="Create departments such as Engineering or Sales."
              action={
                <Button type="primary" onClick={() => openModal(null)}>
                  New department
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {departments.isPending
              ? Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="hf-surface h-[148px] animate-pulse" />
                ))
              : (departments.data ?? []).map((department) => (
                  <article key={department.id} className="hf-surface flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-lg text-primary">
                        <ApartmentOutlined />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="m-0 truncate text-[15px] font-semibold text-slate-900">
                          {department.name}
                        </h2>
                        <p className="mt-0.5 mb-0 line-clamp-2 text-[13px] text-slate-500">
                          {department.description ?? 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3">
                      <span className="text-[13px] text-slate-600">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {department.job_postings_count ?? 0}
                        </span>{' '}
                        job{department.job_postings_count === 1 ? '' : 's'}
                      </span>
                      <span className="flex gap-1">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          aria-label={`Edit ${department.name}`}
                          onClick={() => openModal(department)}
                        />
                        <Popconfirm
                          title={`Delete ${department.name}?`}
                          description="Jobs in this department will keep existing without a department."
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                          onConfirm={() =>
                            remove.mutate(department.id, {
                              onSuccess: () => void message.success('Department deleted.'),
                              onError: (error) => void message.error(toApiError(error).message),
                            })
                          }
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label={`Delete ${department.name}`}
                          />
                        </Popconfirm>
                      </span>
                    </div>
                  </article>
                ))}
          </div>
        )}
      </div>
      <DepartmentModal department={editing} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
