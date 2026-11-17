import { zodResolver } from '@hookform/resolvers/zod';
import { App, DatePicker, Form, Input, InputNumber, Modal } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormInput } from '@/components/form/FormInput';
import { FormSelect } from '@/components/form/FormSelect';
import { EMPLOYMENT_TYPE_LABELS, toOptions } from '@/features/jobs/types';
import { applyApiErrors } from '@/utils/forms';
import { useSaveOffer } from '../queries';
import { offerFormSchema, type OfferFormInput, type OfferFormValues } from '../schemas';
import type { Offer } from '../types';

interface OfferFormModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  candidateName: string;
  offer?: Offer;
  onSaved?: (offer: Offer) => void;
}

const DEFAULTS: OfferFormInput = {
  salary_amount: 0,
  currency: 'EUR',
  contract_type: 'full_time',
  start_date: null,
  expires_at: null,
  message: '',
  internal_notes: '',
};

export function OfferFormModal({
  open,
  onClose,
  applicationId,
  candidateName,
  offer,
  onSaved,
}: OfferFormModalProps) {
  const { message } = App.useApp();
  const save = useSaveOffer();
  const { control, handleSubmit, setError, reset } = useForm<
    OfferFormInput,
    unknown,
    OfferFormValues
  >({
    resolver: zodResolver(offerFormSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      offer
        ? {
            salary_amount: offer.salary_amount,
            currency: offer.currency,
            contract_type: offer.contract_type,
            start_date: dayjs(offer.start_date),
            expires_at: dayjs(offer.expires_at),
            message: offer.message ?? '',
            internal_notes: offer.internal_notes ?? '',
          }
        : DEFAULTS,
    );
  }, [open, offer, reset]);

  const onSubmit = async (values: OfferFormValues) => {
    try {
      const saved = await save.mutateAsync({
        id: offer?.id,
        payload: {
          application_id: offer ? undefined : applicationId,
          salary_amount: values.salary_amount,
          currency: values.currency,
          contract_type: values.contract_type,
          start_date: values.start_date.format('YYYY-MM-DD'),
          expires_at: values.expires_at.endOf('day').toISOString(),
          message: values.message || null,
          internal_notes: values.internal_notes || null,
        },
      });
      void message.success(offer ? 'Offer updated.' : 'Offer drafted.');
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, [
        'salary_amount',
        'currency',
        'contract_type',
        'start_date',
        'expires_at',
        'message',
        'internal_notes',
      ]);
      if (!mapped) void message.error(apiError.message);
    }
  };

  const dateField = (name: 'start_date' | 'expires_at', label: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          required
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <DatePicker
            id={name}
            className="w-full"
            value={field.value}
            onChange={(v) => field.onChange(v)}
            disabledDate={(d) => d.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
      )}
    />
  );

  return (
    <Modal
      title={offer ? 'Edit offer' : `New offer for ${candidateName}`}
      open={open}
      okText={offer ? 'Save' : 'Save draft'}
      confirmLoading={save.isPending}
      onCancel={onClose}
      onOk={() => void handleSubmit(onSubmit)()}
      width={640}
      destroyOnHidden
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <Form layout="vertical" component={false}>
          <div className="grid gap-x-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Controller
                control={control}
                name="salary_amount"
                render={({ field, fieldState }) => (
                  <Form.Item
                    label="Yearly salary"
                    htmlFor="salary_amount"
                    required
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                  >
                    <InputNumber<number>
                      id="salary_amount"
                      className="w-full"
                      min={0}
                      step={1000}
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? 0)}
                      formatter={(v) =>
                        v === undefined ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={(v) => Number((v ?? '').replace(/,/g, ''))}
                    />
                  </Form.Item>
                )}
              />
            </div>
            <FormInput control={control} name="currency" label="Currency" maxLength={3} required />
          </div>
          <div className="grid gap-x-4 md:grid-cols-3">
            <FormSelect
              control={control}
              name="contract_type"
              label="Contract"
              options={toOptions(EMPLOYMENT_TYPE_LABELS)}
              required
            />
            {dateField('start_date', 'Start date')}
            {dateField('expires_at', 'Respond by')}
          </div>
          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <Form.Item label="Message to the candidate" htmlFor="offer-message">
                <Input.TextArea id="offer-message" rows={4} maxLength={5000} {...field} />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name="internal_notes"
            render={({ field }) => (
              <Form.Item
                label="Internal notes"
                htmlFor="offer-notes"
                extra="Visible to your team only (e.g. budget approval)."
              >
                <Input.TextArea id="offer-notes" rows={2} maxLength={5000} {...field} />
              </Form.Item>
            )}
          />
        </Form>
      </form>
    </Modal>
  );
}
