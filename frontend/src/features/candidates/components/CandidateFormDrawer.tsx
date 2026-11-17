import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Link } from 'react-router';
import { FormDate } from '@/components/form/FormDate';
import { FormInput } from '@/components/form/FormInput';
import { useSkillSuggestions } from '@/features/jobs/queries';
import { applyApiErrors } from '@/utils/forms';
import { fetchDuplicates } from '../api';
import { useSaveCandidate, useTags } from '../queries';
import {
  candidateFormSchema,
  candidateToForm,
  emptyCandidateForm,
  formToPayload,
  type CandidateFormValues,
} from '../schemas';
import type { Candidate, DuplicateMatch } from '../types';

interface CandidateFormDrawerProps {
  open: boolean;
  candidate?: Candidate;
  onClose: () => void;
  onSaved: (candidate: Candidate) => void;
}

const FIELDS: FieldPath<CandidateFormValues>[] = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'location',
  'headline',
  'linkedin_url',
  'portfolio_url',
];

export function CandidateFormDrawer({
  open,
  candidate,
  onClose,
  onSaved,
}: CandidateFormDrawerProps) {
  const { message } = App.useApp();
  const save = useSaveCandidate();
  const tags = useTags();
  const [skillSearch, setSkillSearch] = useState('');
  const skills = useSkillSuggestions(skillSearch);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, reset, getValues } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: emptyCandidateForm,
  });
  const experiences = useFieldArray({ control, name: 'experiences' });
  const educations = useFieldArray({ control, name: 'educations' });
  const currentFlags = useWatch({ control, name: 'experiences' });

  useEffect(() => {
    if (open) {
      reset(candidate ? candidateToForm(candidate) : emptyCandidateForm);
    }
  }, [open, candidate, reset]);

  const close = () => {
    setDuplicates([]);
    setFormError(null);
    onClose();
  };

  /** Checks for possible duplicates when identifying fields lose focus. */
  const checkDuplicates = async () => {
    const values = getValues();
    if (!values.email && !values.phone && !(values.first_name && values.last_name)) return;
    try {
      setDuplicates(
        await fetchDuplicates({
          email: values.email || undefined,
          phone: values.phone || undefined,
          first_name: values.first_name || undefined,
          last_name: values.last_name || undefined,
          ignore_id: candidate?.id,
        }),
      );
    } catch {
      setDuplicates([]);
    }
  };

  const onSubmit = async (values: CandidateFormValues) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({ id: candidate?.id, payload: formToPayload(values) });
      void message.success(candidate ? 'Candidate updated.' : 'Candidate created.');
      setDuplicates([]);
      onSaved(saved);
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, FIELDS);
      if (!mapped) setFormError(apiError.message);
    }
  };

  return (
    <Drawer
      title={candidate ? `Edit ${candidate.full_name}` : 'Add candidate'}
      open={open}
      onClose={close}
      size="large"
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={close}>Cancel</Button>
          <Button
            type="primary"
            loading={save.isPending}
            onClick={() => void handleSubmit(onSubmit)()}
          >
            Save
          </Button>
        </Space>
      }
    >
      {formError ? <Alert type="error" showIcon title={formError} className="mb-4" /> : null}
      {duplicates.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="Possible duplicate candidates"
          description={
            <ul className="m-0 pl-4">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link to={`/candidates/${d.id}`} target="_blank">
                    {d.full_name}
                  </Link>{' '}
                  · {d.email}
                  {d.phone ? ` · ${d.phone}` : ''}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}
      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        onBlur={(event) => {
          const target: EventTarget = event.target;
          const name = target instanceof HTMLInputElement ? target.name : '';
          if (['email', 'phone', 'last_name'].includes(name)) void checkDuplicates();
        }}
        noValidate
      >
        <Form layout="vertical" component={false}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <FormInput control={control} name="first_name" label="First name" required autoFocus />
            <FormInput control={control} name="last_name" label="Last name" required />
            <FormInput control={control} name="email" label="Email" type="email" required />
            <FormInput control={control} name="phone" label="Phone" />
            <FormInput
              control={control}
              name="headline"
              label="Headline"
              placeholder="e.g. Senior React developer"
            />
            <FormInput control={control} name="location" label="Location" />
            <FormInput
              control={control}
              name="linkedin_url"
              label="LinkedIn"
              type="url"
              placeholder="https://linkedin.com/in/…"
            />
            <FormInput
              control={control}
              name="portfolio_url"
              label="Portfolio / website"
              type="url"
            />
          </div>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <Form.Item label="Skills" htmlFor="skills">
                <Select
                  id="skills"
                  mode="tags"
                  value={field.value}
                  onChange={field.onChange}
                  onSearch={setSkillSearch}
                  tokenSeparators={[',']}
                  options={(skills.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
                />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <Form.Item label="Tags" htmlFor="tags">
                <Select
                  id="tags"
                  mode="tags"
                  value={field.value}
                  onChange={field.onChange}
                  tokenSeparators={[',']}
                  options={(tags.data ?? []).map((t) => ({ value: t.name, label: t.name }))}
                />
              </Form.Item>
            )}
          />

          <Divider titlePlacement="start">Experience</Divider>
          {experiences.fields.map((item, index) => (
            <div key={item.id} className="mb-4 rounded-lg border border-solid border-slate-200 p-4">
              <div className="grid gap-x-4 md:grid-cols-2">
                <FormInput
                  control={control}
                  name={`experiences.${index}.title`}
                  label="Title"
                  required
                />
                <FormInput
                  control={control}
                  name={`experiences.${index}.company_name`}
                  label="Company"
                  required
                />
                <FormDate
                  control={control}
                  name={`experiences.${index}.start_date`}
                  label="Start"
                />
                <FormDate
                  control={control}
                  name={`experiences.${index}.end_date`}
                  label="End"
                  disabled={currentFlags[index]?.is_current}
                />
              </div>
              <Controller
                control={control}
                name={`experiences.${index}.is_current`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="mb-3"
                  >
                    Current position
                  </Checkbox>
                )}
              />
              <Controller
                control={control}
                name={`experiences.${index}.description`}
                render={({ field }) => (
                  <Input.TextArea
                    aria-label="Description"
                    rows={2}
                    maxLength={2000}
                    placeholder="Description"
                    {...field}
                  />
                )}
              />
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                className="mt-2 p-0"
                onClick={() => experiences.remove(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              experiences.append({
                company_name: '',
                title: '',
                start_date: null,
                end_date: null,
                is_current: false,
                description: '',
              })
            }
          >
            Add experience
          </Button>

          <Divider titlePlacement="start">Education</Divider>
          {educations.fields.map((item, index) => (
            <div key={item.id} className="mb-4 rounded-lg border border-solid border-slate-200 p-4">
              <div className="grid gap-x-4 md:grid-cols-2">
                <FormInput
                  control={control}
                  name={`educations.${index}.institution`}
                  label="Institution"
                  required
                />
                <FormInput control={control} name={`educations.${index}.degree`} label="Degree" />
                <FormInput
                  control={control}
                  name={`educations.${index}.field_of_study`}
                  label="Field of study"
                />
                <div />
                <FormDate control={control} name={`educations.${index}.start_date`} label="Start" />
                <FormDate control={control} name={`educations.${index}.end_date`} label="End" />
              </div>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                className="p-0"
                onClick={() => educations.remove(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              educations.append({
                institution: '',
                degree: '',
                field_of_study: '',
                start_date: null,
                end_date: null,
              })
            }
          >
            Add education
          </Button>
          <Typography.Paragraph type="secondary" className="mt-6 text-xs">
            Only store information that is relevant to recruitment.
          </Typography.Paragraph>
        </Form>
      </form>
    </Drawer>
  );
}
