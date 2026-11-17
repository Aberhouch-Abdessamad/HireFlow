import { InboxOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Checkbox, Form, Input, Result, Upload } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormInput } from '@/components/form/FormInput';
import { applyApiErrors } from '@/utils/forms';
import { applyToJob } from '../api';
import { applySchema } from '../schemas';

type ApplyInput = z.input<typeof applySchema>;
type ApplyValues = z.output<typeof applySchema>;

const FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'linkedin_url',
  'cover_letter',
  'cv',
  'consent',
] as const;

export function ApplyForm({ slug, companyName }: { slug: string; companyName: string }) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ApplyInput, unknown, ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      linkedin_url: '',
      cover_letter: '',
      cv: null,
      consent: false,
      website: '',
    },
  });

  const onSubmit = async (values: ApplyValues) => {
    setFormError(null);
    try {
      setSubmitted(await applyToJob(slug, values));
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, FIELDS);
      if (!mapped) setFormError(apiError.message);
    }
  };

  if (submitted) {
    return (
      <div className="hf-surface">
        <Result
          status="success"
          title="Application sent"
          subTitle={`${submitted} ${companyName} will review it and get back to you.`}
        />
      </div>
    );
  }

  return (
    <section id="apply" className="hf-surface scroll-mt-24 overflow-hidden">
      <div className="border-b border-border-soft bg-primary-soft px-6 py-5">
        <h2 className="m-0 text-lg font-semibold text-slate-900">Apply for this position</h2>
        <p className="mt-1 mb-0 text-[13px] text-slate-500">
          It takes about two minutes. Fields marked * are required.
        </p>
      </div>
      <div className="p-6">
        {formError ? <Alert type="error" showIcon title={formError} className="mb-4" /> : null}
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
          <Form layout="vertical" component={false}>
            <div className="grid gap-x-4 md:grid-cols-2">
              <FormInput
                control={control}
                name="first_name"
                label="First name"
                autoComplete="given-name"
                required
              />
              <FormInput
                control={control}
                name="last_name"
                label="Last name"
                autoComplete="family-name"
                required
              />
              <FormInput
                control={control}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
              />
              <FormInput control={control} name="phone" label="Phone" autoComplete="tel" />
            </div>
            <FormInput
              control={control}
              name="linkedin_url"
              label="LinkedIn profile"
              type="url"
              placeholder="https://linkedin.com/in/…"
            />
            <Controller
              control={control}
              name="cv"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="CV"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Upload.Dragger
                    accept=".pdf,.docx"
                    maxCount={1}
                    beforeUpload={(file) => {
                      field.onChange(file);
                      return false;
                    }}
                    onRemove={() => field.onChange(null)}
                    fileList={
                      field.value ? [{ uid: '1', name: field.value.name, status: 'done' }] : []
                    }
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p>Click or drag your CV here</p>
                    <p className="text-xs text-slate-500">PDF or Word (.docx), up to 5 MB</p>
                  </Upload.Dragger>
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="cover_letter"
              render={({ field }) => (
                <Form.Item label="Cover letter" htmlFor="cover_letter">
                  <Input.TextArea
                    id="cover_letter"
                    rows={5}
                    maxLength={5000}
                    showCount
                    {...field}
                  />
                </Form.Item>
              )}
            />
            {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
            <Controller
              control={control}
              name="website"
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
              )}
            />
            <Controller
              control={control}
              name="consent"
              render={({ field, fieldState }) => (
                <Form.Item
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Checkbox
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  >
                    I agree that {companyName} may store and process my application data for
                    recruitment purposes.
                  </Checkbox>
                </Form.Item>
              )}
            />
            <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
              Submit application
            </Button>
          </Form>
        </form>
      </div>
    </section>
  );
}
