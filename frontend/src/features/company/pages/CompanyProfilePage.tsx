import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Popconfirm } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ErrorState } from '@/components/ErrorState';
import { FileUploader } from '@/components/FileUploader';
import { FormInput } from '@/components/form/FormInput';
import { FormSelect } from '@/components/form/FormSelect';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { FormSection } from '@/components/form/FormSection';
import { applyApiErrors } from '@/utils/forms';
import { useCompany, useCompanyLogo, useUpdateCompany } from '../queries';
import { companySchema, type CompanyFormInput, type CompanyFormOutput } from '../schemas';
import type { Company } from '../types';

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+'].map((value) => ({
  value,
  label: `${value} employees`,
}));

const TIMEZONE_OPTIONS = Intl.supportedValuesOf('timeZone').map((zone) => ({
  value: zone,
  label: zone,
}));

function toFormValues(company: Company): CompanyFormInput {
  return {
    name: company.name,
    website: company.website ?? '',
    industry: company.industry ?? '',
    size: (company.size as CompanyFormInput['size']) ?? null,
    country: company.country ?? '',
    timezone: company.timezone,
    description: company.description ?? '',
  };
}

const FIELDS = [
  'name',
  'website',
  'industry',
  'size',
  'country',
  'timezone',
  'description',
] as const;

export function CompanyProfilePage() {
  const { message } = App.useApp();
  const company = useCompany();
  const update = useUpdateCompany();
  const logo = useCompanyLogo();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = useForm<CompanyFormInput, unknown, CompanyFormOutput>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (company.data) reset(toFormValues(company.data));
  }, [company.data, reset]);

  const onSubmit = async (values: CompanyFormOutput) => {
    try {
      const saved = await update.mutateAsync(values);
      reset(toFormValues(saved));
      void message.success('Company profile saved.');
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, FIELDS);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Company profile"
        description="This information appears on your public careers page."
      />
      {company.isPending ? (
        <LoadingSkeleton rows={6} />
      ) : company.isError ? (
        <ErrorState error={company.error} onRetry={() => void company.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          <FormSection title="Logo" description="Shown on your careers page and job listings.">
            <div className="mb-5 flex flex-wrap items-center gap-5">
              {company.data.logo_url ? (
                <img
                  src={company.data.logo_url}
                  alt={`${company.data.name} logo`}
                  className="h-20 w-20 rounded-2xl object-cover ring-1 ring-border"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-3xl font-semibold text-white">
                  {company.data.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <FileUploader
                    accept=".png,.jpg,.jpeg,.webp"
                    mimeTypes={['image/png', 'image/jpeg', 'image/webp']}
                    maxSizeMb={2}
                    label={company.data.logo_url ? 'Replace logo' : 'Upload logo'}
                    onUpload={async (file) => {
                      await logo.upload.mutateAsync(file);
                      void message.success('Logo updated.');
                    }}
                  />
                  {company.data.logo_url ? (
                    <Popconfirm
                      title="Remove the logo?"
                      onConfirm={() =>
                        logo.remove.mutate(undefined, {
                          onSuccess: () => void message.success('Logo removed.'),
                        })
                      }
                    >
                      <Button danger loading={logo.remove.isPending}>
                        Remove
                      </Button>
                    </Popconfirm>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">PNG, JPG or WebP, up to 2 MB.</span>
              </div>
            </div>
          </FormSection>
          <FormSection
            title="Details"
            description="Your company name, website and location settings."
          >
            <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
              <Form layout="vertical" component={false}>
                <div className="grid gap-x-6 md:grid-cols-2">
                  <FormInput control={control} name="name" label="Company name" required />
                  <FormInput
                    control={control}
                    name="website"
                    label="Website"
                    type="url"
                    placeholder="https://example.com"
                  />
                  <FormInput control={control} name="industry" label="Industry" />
                  <FormSelect
                    control={control}
                    name="size"
                    label="Company size"
                    options={SIZE_OPTIONS}
                    allowClear
                  />
                  <FormInput
                    control={control}
                    name="country"
                    label="Country code"
                    placeholder="MA"
                    maxLength={2}
                  />
                  <FormSelect
                    control={control}
                    name="timezone"
                    label="Timezone"
                    options={TIMEZONE_OPTIONS}
                    showSearch
                    required
                  />
                </div>
                <Controller
                  control={control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Form.Item
                      label="About the company"
                      htmlFor="description"
                      validateStatus={fieldState.error ? 'error' : undefined}
                      help={fieldState.error?.message}
                    >
                      <Input.TextArea
                        id="description"
                        rows={5}
                        maxLength={5000}
                        showCount
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </Form.Item>
                  )}
                />
                <Form.Item
                  label="Slug"
                  extra="Used in your careers page URL. It cannot be changed."
                >
                  <Input value={company.data.slug} disabled />
                </Form.Item>
                <div className="mb-4 flex justify-end border-t border-border-soft pt-4">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={update.isPending}
                    disabled={!isDirty}
                  >
                    Save changes
                  </Button>
                </div>
              </Form>
            </form>
          </FormSection>
        </div>
      )}
    </>
  );
}
