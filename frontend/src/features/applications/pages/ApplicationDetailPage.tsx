import {
  CalendarOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  RedoOutlined,
  RightOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Select } from 'antd';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { NotesPanel } from '@/components/NotesPanel';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { StageProgress } from '@/components/StageProgress';
import { UserAvatar } from '@/components/UserAvatar';
import { InterviewStatusBadge } from '@/features/interviews/components/InterviewStatusBadge';
import { ScheduleInterviewModal } from '@/features/interviews/components/ScheduleInterviewModal';
import { useInterviews } from '@/features/interviews/queries';
import { useRecruiters } from '@/features/jobs/queries';
import { OfferFormModal } from '@/features/offers/components/OfferFormModal';
import { OfferStatusBadge } from '@/features/offers/components/OfferStatusBadge';
import { useOffers } from '@/features/offers/queries';
import dayjs from 'dayjs';
import { usePermissions } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { formatDate, formatMoney } from '@/utils/format';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { RejectModal } from '../components/RejectModal';
import {
  useAddApplicationNote,
  useApplication,
  useApplicationHistory,
  useApplicationNotes,
  useAssignApplication,
  useMoveApplication,
  useReopenApplication,
  useStages,
} from '../queries';
import { APPLICATION_STATUS_LABELS, SOURCE_LABELS, type StageHistoryEntry } from '../types';

function historyTitle(entry: StageHistoryEntry): string {
  if (entry.from_status === null) return `Applied (${entry.to_stage ?? 'first stage'})`;
  if (entry.to_status !== entry.from_status)
    return `${APPLICATION_STATUS_LABELS[entry.to_status]}${entry.to_stage ? ` at ${entry.to_stage}` : ''}`;
  return `${entry.from_stage ?? '?'} → ${entry.to_stage ?? '?'}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 truncate text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { message } = App.useApp();
  const id = Number(useParams().id);
  const { can } = usePermissions();
  const application = useApplication(id);
  const stages = useStages();
  const history = useApplicationHistory(id);
  const notes = useApplicationNotes(id);
  const addNote = useAddApplicationNote(id);
  const move = useMoveApplication();
  const assign = useAssignApplication();
  const reopen = useReopenApplication();
  const recruiters = useRecruiters();
  const [targetStage, setTargetStage] = useState<number | undefined>();
  const [moveNote, setMoveNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [offering, setOffering] = useState(false);
  const interviews = useInterviews({ application_id: id, per_page: 50 }, can('interviews.view'));
  const offers = useOffers({ page: 1, per_page: 20, application_id: id }, can('offers.view'));

  if (application.isPending) return <LoadingSkeleton rows={8} />;
  if (application.isError)
    return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;

  const a = application.data;
  const onError = (error: unknown) => void message.error(toApiError(error).message);
  const isActive = a.status === 'active';
  const orderedStages = stages.data ?? [];

  const submitMove = () => {
    if (!targetStage) return;
    move.mutate(
      { id, stageId: targetStage, notes: moveNote },
      {
        onSuccess: (updated) => {
          void message.success(`Moved to ${updated.stage?.name ?? 'the new stage'}.`);
          setTargetStage(undefined);
          setMoveNote('');
        },
        onError,
      },
    );
  };

  return (
    <>
      <PageHeader
        back={{ to: '/applications', label: 'Applications' }}
        title={
          <span className="flex items-center gap-4">
            <UserAvatar name={a.candidate?.full_name ?? '?'} size="lg" />
            <span className="min-w-0 truncate">{a.candidate?.full_name}</span>
          </span>
        }
        meta={
          <>
            <ApplicationStatusBadge status={a.status} />
            <span className="text-[13px] text-slate-500">
              Applied for{' '}
              <Link to={`/jobs/${a.job?.id ?? ''}`} className="font-medium">
                {a.job?.title}
              </Link>{' '}
              · {formatDate(a.applied_at)} · {SOURCE_LABELS[a.source]}
            </span>
          </>
        }
        actions={
          <>
            {isActive && can('applications.reject') ? (
              <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejecting(true)}>
                Reject
              </Button>
            ) : null}
            {a.status === 'rejected' && can('applications.reject') ? (
              <Button
                icon={<RedoOutlined />}
                loading={reopen.isPending}
                onClick={() =>
                  reopen.mutate(id, {
                    onSuccess: () => void message.success('Application reopened.'),
                    onError,
                  })
                }
              >
                Reopen
              </Button>
            ) : null}
            {isActive && can('offers.create') ? (
              <Button icon={<FileDoneOutlined />} onClick={() => setOffering(true)}>
                Create offer
              </Button>
            ) : null}
            {isActive && can('interviews.schedule') ? (
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => setScheduling(true)}
              >
                Schedule interview
              </Button>
            ) : null}
          </>
        }
      />

      {a.rejection ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <StopOutlined className="mt-0.5 text-rose-500" />
          <div className="text-[13px]">
            <div className="font-semibold text-rose-800">
              Rejected on {formatDate(a.rejection.rejected_at)}
              {a.rejection.reason_label ? ` · ${a.rejection.reason_label}` : ''}
            </div>
            {a.rejection.note ? (
              <div className="mt-0.5 whitespace-pre-line text-rose-700">{a.rejection.note}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="hf-surface mb-6 px-5 pt-5 pb-4">
        <StageProgress stages={orderedStages} currentId={a.stage?.id} state={a.status} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {isActive && can('applications.update_stage') ? (
            <SectionCard
              title="Move to another stage"
              description="Candidates move to Hired automatically when they accept an offer."
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select<number>
                    aria-label="Target stage"
                    placeholder="Choose a stage"
                    className="sm:w-64"
                    value={targetStage}
                    onChange={setTargetStage}
                    options={orderedStages
                      .filter((s) => s.id !== a.stage?.id && s.type !== 'hired')
                      .map((s) => ({ value: s.id, label: s.name }))}
                  />
                  <Input
                    aria-label="Transition note"
                    maxLength={2000}
                    placeholder="Optional note (saved in the history)"
                    value={moveNote}
                    onChange={(e) => setMoveNote(e.target.value)}
                  />
                  <Button
                    type="primary"
                    disabled={!targetStage}
                    loading={move.isPending}
                    onClick={submitMove}
                  >
                    Move
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {can('interviews.view') ? (
            <SectionCard title="Interviews" flush>
              {(interviews.data?.data ?? []).length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarOutlined />}
                  title="No interviews yet"
                  description="Schedule one to collect structured feedback."
                />
              ) : (
                <ul className="m-0 list-none divide-y divide-border-soft p-0">
                  {(interviews.data?.data ?? []).map((interview) => (
                    <li key={interview.id}>
                      <Link
                        to={`/interviews/${interview.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 !text-inherit hover:bg-slate-50"
                      >
                        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft leading-none text-primary">
                          <span className="text-[10px] font-semibold uppercase">
                            {dayjs(interview.scheduled_at).format('MMM')}
                          </span>
                          <span className="text-base font-semibold">
                            {dayjs(interview.scheduled_at).format('D')}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">
                            {interview.type_label}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {dayjs(interview.scheduled_at).format('dddd, HH:mm')}
                            {interview.feedback_count
                              ? ` · ${interview.feedback_count} feedback`
                              : ''}
                          </span>
                        </span>
                        <InterviewStatusBadge status={interview.status} />
                        <RightOutlined className="text-xs text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}

          {can('offers.view') && (offers.data?.data ?? []).length > 0 ? (
            <SectionCard title="Offers" flush>
              <ul className="m-0 list-none divide-y divide-border-soft p-0">
                {(offers.data?.data ?? []).map((offer) => (
                  <li key={offer.id}>
                    <Link
                      to={`/offers/${offer.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 !text-inherit hover:bg-slate-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-lg text-pink-600">
                        <FileDoneOutlined />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          {formatMoney(offer.salary_amount, offer.currency)} / year
                        </span>
                        <span className="block text-xs text-slate-500">
                          Starts {formatDate(offer.start_date)}
                        </span>
                      </span>
                      <OfferStatusBadge status={offer.status} />
                      <RightOutlined className="text-xs text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {a.cover_letter ? (
            <SectionCard title="Cover letter">
              <p className="m-0 text-[15px] leading-7 whitespace-pre-line text-slate-700">
                {a.cover_letter}
              </p>
            </SectionCard>
          ) : null}

          <NotesPanel
            title="Team comments"
            notes={notes.data}
            loading={notes.isPending}
            canWrite={can('applications.view')}
            placeholder="Share feedback with the hiring team…"
            onAdd={(body) => addNote.mutateAsync(body)}
          />
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="Candidate"
            extra={
              a.candidate ? (
                <Link to={`/candidates/${a.candidate.id}`} className="text-[13px] font-medium">
                  View profile
                </Link>
              ) : null
            }
          >
            {a.candidate?.headline ? (
              <p className="mt-0 mb-3 text-sm text-slate-600">{a.candidate.headline}</p>
            ) : null}
            <dl className="m-0 -my-2.5 divide-y divide-border-soft">
              <DetailRow label="Email">{a.candidate?.email}</DetailRow>
              <DetailRow label="Location">{a.candidate?.location ?? '—'}</DetailRow>
              <DetailRow label="Source">{SOURCE_LABELS[a.source]}</DetailRow>
              <DetailRow label="Current stage">{a.stage?.name}</DetailRow>
              <DetailRow label="In stage since">{formatDate(a.stage_entered_at)}</DetailRow>
            </dl>
          </SectionCard>

          <SectionCard title="Owner" description="Recruiter responsible for this application">
            {can('applications.assign') ? (
              <Select<number>
                aria-label="Assigned recruiter"
                allowClear
                className="w-full"
                placeholder="Unassigned"
                loading={recruiters.isPending || assign.isPending}
                value={a.assignee?.id}
                options={(recruiters.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
                onChange={(userId) =>
                  assign.mutate(
                    { id, userId: userId ?? null },
                    { onSuccess: () => void message.success('Assignment updated.'), onError },
                  )
                }
              />
            ) : a.assignee ? (
              <span className="flex items-center gap-2 text-sm">
                <UserAvatar name={a.assignee.name} size="sm" />
                {a.assignee.name}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Unassigned</span>
            )}
          </SectionCard>

          <SectionCard title="History">
            {history.isPending ? (
              <LoadingSkeleton rows={3} />
            ) : (
              <ActivityTimeline
                entries={(history.data ?? []).map((entry) => ({
                  id: entry.id,
                  title: historyTitle(entry),
                  description: entry.notes,
                  actor: entry.performed_by ?? (entry.from_status === null ? 'Candidate' : null),
                  at: entry.created_at,
                  color:
                    entry.to_status === 'rejected'
                      ? 'red'
                      : entry.to_status === 'hired'
                        ? 'green'
                        : 'blue',
                }))}
              />
            )}
          </SectionCard>
        </div>
      </div>

      <ScheduleInterviewModal
        open={scheduling}
        onClose={() => setScheduling(false)}
        applicationId={id}
        candidateName={a.candidate?.full_name ?? 'candidate'}
      />
      <OfferFormModal
        open={offering}
        onClose={() => setOffering(false)}
        applicationId={id}
        candidateName={a.candidate?.full_name ?? 'candidate'}
      />
      <RejectModal
        applicationId={id}
        candidateName={a.candidate?.full_name ?? 'Candidate'}
        open={rejecting}
        onClose={() => setRejecting(false)}
      />
    </>
  );
}
