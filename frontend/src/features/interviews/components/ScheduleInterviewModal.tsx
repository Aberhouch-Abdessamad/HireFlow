import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormInput } from '@/components/form/FormInput';
import { FormSelect } from '@/components/form/FormSelect';
import { toOptions } from '@/features/jobs/types';
import { applyApiErrors } from '@/utils/forms';
import { useInterviewers, useSaveInterview } from '../queries';
import { interviewFormSchema, type InterviewFormInput, type InterviewFormValues } from '../schemas';
import { INTERVIEW_TYPE_LABELS, type Interview } from '../types';

interface ScheduleInterviewModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  candidateName: string;
  /** When set, the modal reschedules/edits this interview. */
  interview?: Interview;
  onSaved?: (interview: Interview) => void;
}

const DEFAULTS: InterviewFormInput = {
  type: 'technical',
  start: null,
  duration_minutes: 60,
  meeting_url: '',
  location: '',
  agenda: '',
  participant_ids: [],
};

function toForm(interview: Interview): InterviewFormInput {
  return {
    type: interview.type,
    start: dayjs(interview.scheduled_at),
    duration_minutes: interview.duration_minutes,
    meeting_url: interview.meeting_url ?? '',
    location: interview.location ?? '',
    agenda: interview.agenda ?? '',
    participant_ids: (interview.participants ?? []).map((p) => p.id),
  };
}

export function ScheduleInterviewModal({
  open,
  onClose,
  applicationId,
  candidateName,
  interview,
  onSaved,
}: ScheduleInterviewModalProps) {
  const { message } = App.useApp();
  const save = useSaveInterview();
  const interviewers = useInterviewers(open);
  const [conflict, setConflict] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<InterviewFormInput, unknown, InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) reset(interview ? toForm(interview) : DEFAULTS);
  }, [open, interview, reset]);

  const close = () => {
    setConflict(null);
    onClose();
  };

  const submit = async (values: InterviewFormValues, force = false) => {
    try {
      const saved = await save.mutateAsync({
        id: interview?.id,
        payload: {
          application_id: interview ? undefined : applicationId,
          type: values.type,
          scheduled_at: values.start.toISOString(),
          duration_minutes: values.duration_minutes,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          meeting_url: values.meeting_url || null,
          location: values.location || null,
          agenda: values.agenda || null,
          participant_ids: values.participant_ids,
          force,
        },
      });
      void message.success(interview ? 'Interview updated.' : 'Interview scheduled.');
      setConflict(null);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, [
        'type',
        'duration_minutes',
        'meeting_url',
        'location',
        'agenda',
        'participant_ids',
      ]);
      if (apiError.code === 'SCHEDULE_CONFLICT') {
        setConflict(apiError.message);
        return;
      }
      if (apiError.fieldErrors.scheduled_at?.[0])
        setError('start', { type: 'server', message: apiError.fieldErrors.scheduled_at[0] });
      const participantError = Object.entries(apiError.fieldErrors).find(([k]) =>
        k.startsWith('participant_ids.'),
      );
      if (participantError?.[1][0])
        setError('participant_ids', { type: 'server', message: participantError[1][0] });
      if (!mapped && !apiError.fieldErrors.scheduled_at && !participantError)
        void message.error(apiError.message);
    }
  };

  // Only active members allowed to interview are offered.
  const options = (interviewers.data ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})`,
  }));

  return (
    <Modal
      title={interview ? 'Reschedule interview' : `Schedule interview with ${candidateName}`}
      open={open}
      onCancel={close}
      width={640}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={close}>
          Cancel
        </Button>,
        conflict ? (
          <Button
            key="force"
            danger
            loading={save.isPending}
            onClick={() => void handleSubmit((v) => submit(v, true))()}
          >
            Schedule anyway
          </Button>
        ) : null,
        <Button
          key="ok"
          type="primary"
          loading={save.isPending}
          onClick={() => void handleSubmit((v) => submit(v))()}
        >
          {interview ? 'Save' : 'Schedule'}
        </Button>,
      ]}
    >
      {conflict ? <Alert type="warning" showIcon title={conflict} className="mb-4" /> : null}
      <form onSubmit={(e) => void handleSubmit((v) => submit(v))(e)} noValidate>
        <Form layout="vertical" component={false}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <FormSelect
              control={control}
              name="type"
              label="Type"
              options={toOptions(INTERVIEW_TYPE_LABELS)}
              required
            />
            <Controller
              control={control}
              name="start"
              render={({ field }) => (
                <Form.Item
                  label="Date and time"
                  htmlFor="start"
                  required
                  validateStatus={errors.start ? 'error' : undefined}
                  help={errors.start?.message}
                >
                  <DatePicker
                    id="start"
                    className="w-full"
                    showTime={{ format: 'HH:mm', minuteStep: 15 }}
                    format="ddd, MMM D YYYY · HH:mm"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="duration_minutes"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Duration (minutes)"
                  htmlFor="duration_minutes"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber<number>
                    id="duration_minutes"
                    className="w-full"
                    min={15}
                    max={480}
                    step={15}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                  />
                </Form.Item>
              )}
            />
            <FormInput
              control={control}
              name="meeting_url"
              label="Meeting link"
              type="url"
              placeholder="https://meet…"
            />
          </div>
          <FormInput control={control} name="location" label="Location (for on-site interviews)" />
          <Controller
            control={control}
            name="participant_ids"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Interviewers"
                htmlFor="participant_ids"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select<number[]>
                  id="participant_ids"
                  mode="multiple"
                  value={field.value}
                  onChange={field.onChange}
                  options={options}
                  loading={interviewers.isPending}
                  optionFilterProp="label"
                />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name="agenda"
            render={({ field }) => (
              <Form.Item label="Agenda / notes for interviewers" htmlFor="agenda">
                <Input.TextArea id="agenda" rows={3} maxLength={5000} {...field} />
              </Form.Item>
            )}
          />
          <p className="text-xs text-slate-500">
            Times are in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
        </Form>
      </form>
    </Modal>
  );
}
