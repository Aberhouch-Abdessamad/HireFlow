import { zodResolver } from '@hookform/resolvers/zod';
import { Button, DatePicker, Form, Input, InputNumber, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { FormInput } from '@/components/form/FormInput';
import { FormActions, FormSection } from '@/components/form/FormSection';
import { FormSelect } from '@/components/form/FormSelect';
import { applyApiErrors } from '@/utils/forms';
import { useDepartments, useRecruiters, useSkillSuggestions } from '../queries';
import { formValuesToPayload, jobFormSchema, type JobFormValues } from '../schemas';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  WORK_MODE_LABELS,
  toOptions,
  type JobPayload,
} from '../types';

interface JobFormProps {
  defaultValues: JobFormValues;
  submitLabel: string;
  onSubmit: (payload: JobPayload) => Promise<void>;
  onCancel: () => void;
}

/** Maps API field names (payload) back to form fields for 422 errors. */
const SERVER_FIELDS: FieldPath<JobFormValues>[] = [
  'title',
  'department_id',
  'location',
  'work_mode',
  'employment_type',
  'experience_level',
  'description',
  'requirements',
  'salary_min',
  'salary_max',
  'salary_currency',
  'expires_at',
  'recruiter_ids',
];

function FieldError({ message }: { message?: string }) {
  return message ? <div className="text-sm text-danger">{message}</div> : null;
}

function TextArea({
  control,
  name,
  label,
  rows,
  required,
}: {
  control: Control<JobFormValues>;
  name: 'description' | 'requirements';
  label: string;
  rows: number;
  required?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          required={required}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <Input.TextArea
            id={name}
            rows={rows}
            maxLength={20000}
            showCount
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        </Form.Item>
      )}
    />
  );
}

function SkillsSelect({
  control,
  name,
  label,
}: {
  control: Control<JobFormValues>;
  name: 'required_skills' | 'preferred_skills';
  label: string;
}) {
  const [search, setSearch] = useState('');
  const suggestions = useSkillSuggestions(search);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <Select
            id={name}
            mode="tags"
            value={field.value}
            onChange={(values: string[]) =>
              field.onChange(values.map((value) => value.trim()).filter(Boolean))
            }
            onSearch={setSearch}
            tokenSeparators={[',']}
            placeholder="Type a skill and press Enter"
            options={(suggestions.data ?? []).map((skill) => ({
              value: skill.name,
              label: skill.name,
            }))}
          />
        </Form.Item>
      )}
    />
  );
}

export function JobForm({ defaultValues, submitLabel, onSubmit, onCancel }: JobFormProps) {
  const departments = useDepartments();
  const recruiters = useRecruiters();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<JobFormValues>({ resolver: zodResolver(jobFormSchema), defaultValues });

  const submit = async (values: JobFormValues) => {
    try {
      await onSubmit(formValuesToPayload(values));
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, SERVER_FIELDS);
      const recruiterError = Object.entries(apiError.fieldErrors).find(([key]) =>
        key.startsWith('recruiter_ids.'),
      );
      if (recruiterError?.[1][0])
        setError('recruiter_ids', { type: 'server', message: recruiterError[1][0] });
      if (!mapped && !recruiterError)
        setError('root', { type: 'server', message: apiError.message });
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate>
      <Form layout="vertical" component={false}>
        <div className="flex flex-col gap-8">
          <FormSection
            title="Basics"
            description="The title, team and format candidates see first."
          >
            <div className="grid gap-x-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormInput control={control} name="title" label="Job title" required autoFocus />
              </div>
              <Controller
                control={control}
                name="department_id"
                render={({ field }) => (
                  <Form.Item label="Department" htmlFor="department_id">
                    <Select<number>
                      id="department_id"
                      allowClear
                      placeholder="No department"
                      loading={departments.isPending}
                      value={field.value ?? undefined}
                      onChange={(value) => field.onChange(value ?? null)}
                      options={(departments.data ?? []).map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </Form.Item>
                )}
              />
              <FormInput
                control={control}
                name="location"
                label="Location"
                placeholder="e.g. Casablanca, Morocco"
              />
              <FormSelect
                control={control}
                name="work_mode"
                label="Work mode"
                options={toOptions(WORK_MODE_LABELS)}
                required
              />
              <FormSelect
                control={control}
                name="employment_type"
                label="Employment type"
                options={toOptions(EMPLOYMENT_TYPE_LABELS)}
                required
              />
              <FormSelect
                control={control}
                name="experience_level"
                label="Experience level"
                options={toOptions(EXPERIENCE_LEVEL_LABELS)}
                required
              />
              <Controller
                control={control}
                name="expires_at"
                render={({ field, fieldState }) => (
                  <Form.Item
                    label="Closes on"
                    htmlFor="expires_at"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    extra="The job closes automatically after this date."
                  >
                    <DatePicker
                      id="expires_at"
                      className="w-full"
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      disabledDate={(date) => date.isBefore(dayjs(), 'day')}
                    />
                  </Form.Item>
                )}
              />
            </div>
          </FormSection>

          <FormSection
            title="Description"
            description="Describe the work, the team and what success looks like."
          >
            <TextArea
              control={control}
              name="description"
              label="About the role"
              rows={8}
              required
            />
            <TextArea control={control} name="requirements" label="Requirements" rows={6} />
          </FormSection>

          <FormSection
            title="Skills"
            description="Required skills are highlighted on the job and used to match candidates."
          >
            <div className="grid gap-x-6 md:grid-cols-2">
              <SkillsSelect control={control} name="required_skills" label="Required skills" />
              <SkillsSelect control={control} name="preferred_skills" label="Nice to have" />
            </div>
          </FormSection>

          <FormSection
            title="Compensation"
            description="Yearly gross range. You decide whether candidates can see it."
          >
            <div className="grid gap-x-6 md:grid-cols-3">
              {(['salary_min', 'salary_max'] as const).map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <Form.Item
                      label={name === 'salary_min' ? 'Minimum (yearly)' : 'Maximum (yearly)'}
                      htmlFor={name}
                      validateStatus={fieldState.error ? 'error' : undefined}
                      help={fieldState.error?.message}
                    >
                      <InputNumber<number>
                        id={name}
                        className="w-full"
                        min={0}
                        step={1000}
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? null)}
                        formatter={(value) =>
                          value === undefined
                            ? ''
                            : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        }
                        parser={(value) => Number((value ?? '').replace(/,/g, ''))}
                      />
                    </Form.Item>
                  )}
                />
              ))}
              <FormInput
                control={control}
                name="salary_currency"
                label="Currency"
                maxLength={3}
                placeholder="EUR"
              />
            </div>
            <Controller
              control={control}
              name="salary_visible"
              render={({ field }) => (
                <div className="mb-5 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <Switch id="salary_visible" checked={field.value} onChange={field.onChange} />
                  <label htmlFor="salary_visible" className="text-[13px] text-slate-700">
                    Show salary on the public careers page
                  </label>
                </div>
              )}
            />
          </FormSection>

          <FormSection
            title="Hiring team"
            description="Recruiters are notified about new applications for this job."
          >
            <Controller
              control={control}
              name="recruiter_ids"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Recruiters"
                  htmlFor="recruiter_ids"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select<number[]>
                    id="recruiter_ids"
                    mode="multiple"
                    placeholder="Assign recruiters"
                    loading={recruiters.isPending}
                    value={field.value}
                    onChange={field.onChange}
                    optionFilterProp="label"
                    options={(recruiters.data ?? []).map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.email})`,
                    }))}
                  />
                </Form.Item>
              )}
            />
          </FormSection>

          <FieldError message={errors.root?.message} />

          <FormActions>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </FormActions>
        </div>
      </Form>
    </form>
  );
}
