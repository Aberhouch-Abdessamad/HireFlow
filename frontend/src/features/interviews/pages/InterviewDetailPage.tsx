import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  FilePdfOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { CandidateCard } from '@/components/CandidateCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { UserAvatar } from '@/components/UserAvatar';
import { usePermissions } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { downloadInterviewDocument } from '../api';
import { FeedbackForm } from '../components/FeedbackForm';
import { InterviewStatusBadge } from '../components/InterviewStatusBadge';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { useCancelInterview, useCompleteInterview, useFeedback, useInterview } from '../queries';
import type { Feedback } from '../types';

const RECOMMENDATION_STYLES: Record<Feedback['recommendation'], string> = {
  strong_hire: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  hire: 'bg-teal-50 text-teal-700 ring-teal-200',
  no_hire: 'bg-amber-50 text-amber-700 ring-amber-200',
  strong_no_hire: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900 tabular-nums">{value}/5</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full ${step <= value ? 'bg-primary' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <UserAvatar name={feedback.author?.name ?? '?'} size="sm" />
          <span className="text-sm font-semibold text-slate-900">{feedback.author?.name}</span>
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${RECOMMENDATION_STYLES[feedback.recommendation]}`}
        >
          {feedback.recommendation_label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <ScoreBar label="Technical" value={feedback.technical_score} />
        <ScoreBar label="Communication" value={feedback.communication_score} />
        <ScoreBar label="Problem solving" value={feedback.problem_solving_score} />
        <ScoreBar label="Overall" value={feedback.overall_rating} />
      </div>
      {feedback.comments ? (
        <p className="mt-4 mb-0 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">
          {feedback.comments}
        </p>
      ) : null}
    </div>
  );
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2 text-[13px] text-slate-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function InterviewDetailPage() {
  const { message } = App.useApp();
  const id = Number(useParams().id);
  const { can, user } = usePermissions();
  const interview = useInterview(id);
  const feedback = useFeedback(id);
  const cancel = useCancelInterview();
  const complete = useCompleteInterview();
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [editingFeedback, setEditingFeedback] = useState(false);

  if (interview.isPending) return <LoadingSkeleton rows={8} />;
  if (interview.isError)
    return <ErrorState error={interview.error} onRetry={() => void interview.refetch()} />;

  const i = interview.data;
  const isScheduler = can('interviews.schedule');
  const onError = (error: unknown) => void message.error(toApiError(error).message);
  const started = dayjs(i.scheduled_at).isBefore(dayjs());
  const myFeedback = feedback.data?.data.find((f) => f.author?.id === user?.id);
  const canSubmit = feedback.data?.meta.can_submit ?? false;

  const participants = i.participants ?? [];
  const submitted = participants.filter((p) => p.has_submitted_feedback).length;

  return (
    <>
      <PageHeader
        back={{ to: '/interviews', label: 'Interviews' }}
        eyebrow={i.type_label}
        title={`Interview with ${i.application?.candidate.full_name ?? 'candidate'}`}
        meta={
          <>
            <InterviewStatusBadge status={i.status} />
            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
              <CalendarOutlined className="text-slate-400" />
              {dayjs(i.scheduled_at).format('dddd, MMMM D YYYY')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
              <ClockCircleOutlined className="text-slate-400" />
              {dayjs(i.scheduled_at).format('HH:mm')} – {dayjs(i.ends_at).format('HH:mm')}
            </span>
          </>
        }
        actions={
          isScheduler && i.status === 'scheduled' ? (
            <>
              <Button danger icon={<CloseOutlined />} onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                Reschedule
              </Button>
              {started ? (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={complete.isPending}
                  onClick={() =>
                    complete.mutate(id, {
                      onError,
                      onSuccess: () => void message.success('Marked as completed.'),
                    })
                  }
                >
                  Mark completed
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {i.status === 'cancelled' ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px]">
          <WarningOutlined className="mt-0.5 text-amber-500" />
          <div>
            <div className="font-semibold text-amber-800">This interview was cancelled</div>
            {i.cancellation_reason ? (
              <div className="mt-0.5 text-amber-700">{i.cancellation_reason}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {i.agenda ? (
            <SectionCard title="Agenda">
              <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
                {i.agenda}
              </p>
            </SectionCard>
          ) : null}

          {canSubmit && i.status !== 'cancelled' ? (
            <SectionCard
              title={myFeedback && !editingFeedback ? 'Your feedback' : 'Submit your feedback'}
              description={
                myFeedback && !editingFeedback
                  ? undefined
                  : 'Score the candidate on each area and add your recommendation.'
              }
              extra={
                myFeedback && !editingFeedback ? (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingFeedback(true)}
                  >
                    Edit
                  </Button>
                ) : null
              }
            >
              {!started ? (
                <EmptyState
                  compact
                  icon={<ClockCircleOutlined />}
                  title="Not started yet"
                  description="You can submit feedback once the interview has started."
                />
              ) : myFeedback && !editingFeedback ? (
                <FeedbackCard feedback={myFeedback} />
              ) : (
                <FeedbackForm
                  interviewId={id}
                  existing={myFeedback}
                  onSaved={() => setEditingFeedback(false)}
                />
              )}
            </SectionCard>
          ) : null}

          <SectionCard
            title="Interviewer feedback"
            extra={
              participants.length > 0 ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {submitted}/{participants.length} submitted
                </span>
              ) : null
            }
          >
            {feedback.isPending ? (
              <LoadingSkeleton rows={2} />
            ) : !feedback.data?.meta.can_see_all ? (
              <EmptyState
                compact
                icon={<EyeInvisibleOutlined />}
                title="Feedback is blind"
                description="Other interviewers' feedback becomes visible after you submit yours, so you can form your own opinion first."
              />
            ) : feedback.data.data.length === 0 ? (
              <EmptyState compact title="No feedback yet" />
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-border-soft p-0">
                {feedback.data.data.map((f) => (
                  <li key={f.id} className="py-5 first:pt-0 last:pb-0">
                    <FeedbackCard feedback={f} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="Candidate"
            extra={
              can('applications.view') && i.application ? (
                <Link to={`/applications/${i.application.id}`} className="text-[13px] font-medium">
                  Open application
                </Link>
              ) : null
            }
          >
            <CandidateCard
              name={i.application?.candidate.full_name ?? ''}
              subtitle={i.application?.candidate.headline}
            />
            <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {i.application?.job.title}
              </span>
              {i.application?.stage ? (
                <span className="rounded-md bg-primary-soft px-2 py-0.5 font-medium text-primary">
                  {i.application.stage}
                </span>
              ) : null}
            </div>
            <div className="mt-5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              CV & documents
            </div>
            {(i.application?.documents ?? []).length === 0 ? (
              <div className="mt-1 text-[13px] text-slate-500">No documents</div>
            ) : (
              <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {(i.application?.documents ?? []).map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:border-indigo-200 hover:bg-primary-soft"
                      onClick={() =>
                        void downloadInterviewDocument(d.download_url, d.original_name).catch(
                          onError,
                        )
                      }
                    >
                      <FilePdfOutlined className="text-rose-500" />
                      <span className="truncate">{d.original_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Logistics">
            <ul className="m-0 -my-2 list-none p-0">
              <InfoRow icon={<ClockCircleOutlined />}>{i.duration_minutes} minutes</InfoRow>
              {i.meeting_url ? (
                <InfoRow icon={<VideoCameraOutlined />}>
                  <a href={i.meeting_url} target="_blank" rel="noopener noreferrer">
                    Join meeting
                  </a>
                </InfoRow>
              ) : null}
              {i.location ? <InfoRow icon={<EnvironmentOutlined />}>{i.location}</InfoRow> : null}
              <InfoRow icon={<UserOutlined />}>Organised by {i.scheduled_by ?? '—'}</InfoRow>
            </ul>
          </SectionCard>

          <SectionCard title="Interview panel">
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar name={p.name} size="sm" />
                    <span className="truncate text-sm font-medium text-slate-900">{p.name}</span>
                  </span>
                  {p.has_submitted_feedback ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircleFilled /> Submitted
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Pending</span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {i.application ? (
        <ScheduleInterviewModal
          open={editing}
          onClose={() => setEditing(false)}
          applicationId={i.application.id}
          candidateName={i.application.candidate.full_name}
          interview={i}
        />
      ) : null}
      <Modal
        title="Cancel interview"
        open={cancelOpen}
        okText="Cancel interview"
        okButtonProps={{ danger: true }}
        cancelText="Keep"
        confirmLoading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onOk={() =>
          cancel.mutate(
            { id, reason: cancelReason.trim() || null },
            {
              onSuccess: () => {
                setCancelOpen(false);
                void message.success('Interview cancelled.');
              },
              onError,
            },
          )
        }
      >
        <Input.TextArea
          aria-label="Reason"
          rows={3}
          maxLength={1000}
          placeholder="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>
    </>
  );
}
