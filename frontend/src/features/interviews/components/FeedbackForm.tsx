import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Radio, Rate } from 'antd';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { applyApiErrors } from '@/utils/forms';
import { useSubmitFeedback } from '../queries';
import { feedbackSchema, type FeedbackValues } from '../schemas';
import { RECOMMENDATION_LABELS, type Feedback, type Recommendation } from '../types';

const SCORES: {
  name: 'technical_score' | 'communication_score' | 'problem_solving_score' | 'overall_rating';
  label: string;
}[] = [
  { name: 'technical_score', label: 'Technical skills' },
  { name: 'communication_score', label: 'Communication' },
  { name: 'problem_solving_score', label: 'Problem solving' },
  { name: 'overall_rating', label: 'Overall rating' },
];

const FIELDS: FieldPath<FeedbackValues>[] = [
  ...SCORES.map((s) => s.name),
  'recommendation',
  'comments',
];

export function FeedbackForm({
  interviewId,
  existing,
  onSaved,
}: {
  interviewId: number;
  existing?: Feedback;
  onSaved?: () => void;
}) {
  const { message } = App.useApp();
  const submit = useSubmitFeedback(interviewId);
  const { control, handleSubmit, setError } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: existing
      ? {
          technical_score: existing.technical_score,
          communication_score: existing.communication_score,
          problem_solving_score: existing.problem_solving_score,
          overall_rating: existing.overall_rating,
          recommendation: existing.recommendation,
          comments: existing.comments ?? '',
        }
      : {
          technical_score: 0,
          communication_score: 0,
          problem_solving_score: 0,
          overall_rating: 0,
          recommendation: undefined,
          comments: '',
        },
  });

  const onSubmit = async (values: FeedbackValues) => {
    try {
      await submit.mutateAsync({ ...values, comments: values.comments || null });
      void message.success('Feedback submitted.');
      onSaved?.();
    } catch (error) {
      const { apiError, mapped } = applyApiErrors(error, setError, FIELDS);
      if (!mapped) void message.error(apiError.message);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      <Form layout="vertical" component={false}>
        <div className="grid gap-x-6 md:grid-cols-2">
          {SCORES.map(({ name, label }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field, fieldState }) => (
                <Form.Item
                  label={label}
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Rate aria-label={label} value={field.value} onChange={field.onChange} />
                </Form.Item>
              )}
            />
          ))}
        </div>
        <Controller
          control={control}
          name="recommendation"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Recommendation"
              required
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message}
            >
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value as Recommendation)}
                options={(Object.keys(RECOMMENDATION_LABELS) as Recommendation[]).map((value) => ({
                  value,
                  label: RECOMMENDATION_LABELS[value],
                }))}
              />
            </Form.Item>
          )}
        />
        <Controller
          control={control}
          name="comments"
          render={({ field }) => (
            <Form.Item label="Comments" htmlFor="feedback-comments">
              <Input.TextArea
                id="feedback-comments"
                rows={4}
                maxLength={5000}
                showCount
                placeholder="Evidence for your ratings: what went well, what concerned you…"
                {...field}
              />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" loading={submit.isPending}>
          {existing ? 'Update feedback' : 'Submit feedback'}
        </Button>
      </Form>
    </form>
  );
}
