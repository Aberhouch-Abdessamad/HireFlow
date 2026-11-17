import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Modal, Popconfirm } from 'antd';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ActivityTimeline, type TimelineEntry } from '@/components/ActivityTimeline';
import { CandidateCard } from '@/components/CandidateCard';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { StageProgress } from '@/components/StageProgress';
import { EMPLOYMENT_TYPE_LABELS } from '@/features/jobs/types';
import { usePermissions } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { formatDate, formatMoney } from '@/utils/format';
import { OfferFormModal } from '../components/OfferFormModal';
import { OfferStatusBadge } from '../components/OfferStatusBadge';
import { useOffer, useOfferAction } from '../queries';
import type { OfferAction, OfferStatus } from '../types';

const FLOW: OfferStatus[] = ['draft', 'pending_approval', 'approved', 'sent', 'accepted'];

type NoteAction = Extract<OfferAction, 'return' | 'accept' | 'reject' | 'withdraw'>;

const NOTE_ACTIONS: Record<
  NoteAction,
  { title: string; field: string; required: boolean; ok: string; danger?: boolean; done: string }
> = {
  return: {
    title: 'Return to draft',
    field: 'comment',
    required: true,
    ok: 'Return',
    done: 'Returned to draft.',
  },
  accept: {
    title: 'Record acceptance',
    field: 'note',
    required: false,
    ok: 'Mark accepted',
    done: 'Offer accepted. The candidate is now hired.',
  },
  reject: {
    title: 'Record that the candidate declined',
    field: 'note',
    required: false,
    ok: 'Mark declined',
    danger: true,
    done: 'Offer marked as declined.',
  },
  withdraw: {
    title: 'Withdraw offer',
    field: 'reason',
    required: false,
    ok: 'Withdraw',
    danger: true,
    done: 'Offer withdrawn.',
  },
};

const FLOW_LABELS = ['Draft', 'Approval', 'Approved', 'Sent', 'Accepted'];

function TermTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function OfferDetailPage() {
  const { message } = App.useApp();
  const id = Number(useParams().id);
  const { can } = usePermissions();
  const offer = useOffer(id);
  const action = useOfferAction();
  const [editing, setEditing] = useState(false);
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [note, setNote] = useState('');

  if (offer.isPending) return <LoadingSkeleton rows={8} />;
  if (offer.isError) return <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />;

  const o = offer.data;
  const onError = (error: unknown) => void message.error(toApiError(error).message);
  const run = (act: OfferAction, done: string, body: Record<string, string | null> = {}) =>
    action.mutate(
      { id, action: act, body },
      { onSuccess: () => void message.success(done), onError },
    );

  const open = ['draft', 'pending_approval', 'approved', 'sent'].includes(o.status);
  const flowIndex = FLOW.indexOf(o.status);

  const buttons = [
    o.status === 'draft' && can('offers.create') ? (
      <Button key="edit" onClick={() => setEditing(true)}>
        Edit
      </Button>
    ) : null,
    o.status === 'draft' && can('offers.create') ? (
      <Button
        key="submit"
        type="primary"
        loading={action.isPending}
        onClick={() => run('submit', 'Submitted for approval.')}
      >
        Submit for approval
      </Button>
    ) : null,
    o.status === 'pending_approval' && can('offers.approve') ? (
      <Button key="return" onClick={() => setNoteAction('return')}>
        Request changes
      </Button>
    ) : null,
    o.status === 'pending_approval' && can('offers.approve') ? (
      <Button
        key="approve"
        type="primary"
        loading={action.isPending}
        onClick={() => run('approve', 'Offer approved.')}
      >
        Approve
      </Button>
    ) : null,
    o.status === 'approved' && can('offers.send') ? (
      <Popconfirm
        key="send"
        title="Send this offer to the candidate by email?"
        onConfirm={() => run('send', 'Offer sent to the candidate.')}
      >
        <Button type="primary" loading={action.isPending}>
          Send to candidate
        </Button>
      </Popconfirm>
    ) : null,
    o.status === 'sent' && can('offers.send') ? (
      <Button key="accept" onClick={() => setNoteAction('accept')}>
        Record acceptance
      </Button>
    ) : null,
    o.status === 'sent' && can('offers.send') ? (
      <Button key="reject" onClick={() => setNoteAction('reject')}>
        Record decline
      </Button>
    ) : null,
    open && can('offers.create') ? (
      <Button key="withdraw" danger onClick={() => setNoteAction('withdraw')}>
        Withdraw
      </Button>
    ) : null,
  ];

  const current = noteAction ? NOTE_ACTIONS[noteAction] : null;

  const timeline: TimelineEntry[] = [
    o.responded_at
      ? {
          id: 'responded',
          title: `Candidate responded (${o.status.replace('_', ' ')})`,
          at: o.responded_at,
          color: o.status === 'accepted' ? ('green' as const) : ('red' as const),
        }
      : null,
    o.sent_at ? { id: 'sent', title: 'Sent to candidate', at: o.sent_at } : null,
    o.approved_at
      ? {
          id: 'approved',
          title: 'Approved',
          actor: o.approved_by,
          at: o.approved_at,
          color: 'green' as const,
        }
      : null,
    o.submitted_at
      ? { id: 'submitted', title: 'Submitted for approval', at: o.submitted_at }
      : null,
    {
      id: 'created',
      title: 'Draft created',
      actor: o.created_by?.name,
      at: o.created_at,
      color: 'gray' as const,
    },
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <>
      <PageHeader
        back={{ to: '/offers', label: 'Offers' }}
        title={`Offer for ${o.application?.candidate.full_name ?? 'candidate'}`}
        meta={
          <>
            <OfferStatusBadge status={o.status} />
            <span className="text-[13px] text-slate-500">
              For{' '}
              <Link to={`/applications/${o.application?.id ?? ''}`} className="font-medium">
                {o.application?.job.title}
              </Link>
            </span>
          </>
        }
        actions={<>{buttons}</>}
      />

      {o.approval_comment && o.status === 'draft' ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px]">
          <WarningOutlined className="mt-0.5 text-amber-500" />
          <div>
            <div className="font-semibold text-amber-800">Changes requested</div>
            <div className="mt-0.5 whitespace-pre-line text-amber-700">{o.approval_comment}</div>
          </div>
        </div>
      ) : null}
      {o.response_note && !open ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[13px]">
          <InfoCircleOutlined className="mt-0.5 text-indigo-500" />
          <div>
            <div className="font-semibold text-indigo-800">Note</div>
            <div className="mt-0.5 whitespace-pre-line text-indigo-700">{o.response_note}</div>
          </div>
        </div>
      ) : null}

      {flowIndex >= 0 ? (
        <div className="hf-surface mb-6 px-5 pt-5 pb-4">
          <StageProgress
            stages={FLOW_LABELS.map((name, index) => ({ id: index, name }))}
            currentId={flowIndex}
            state={o.status === 'accepted' ? 'hired' : 'active'}
          />
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Terms">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-primary p-4 text-white sm:col-span-2">
                <div className="text-xs font-medium text-white/80">Yearly salary</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(o.salary_amount, o.currency)}
                </div>
              </div>
              <TermTile
                icon={<FileTextOutlined />}
                label="Contract"
                value={EMPLOYMENT_TYPE_LABELS[o.contract_type]}
              />
              <TermTile
                icon={<CalendarOutlined />}
                label="Start date"
                value={formatDate(o.start_date)}
              />
              <TermTile
                icon={<ClockCircleOutlined />}
                label="Respond by"
                value={formatDate(o.expires_at)}
              />
            </div>
          </SectionCard>
          {o.message ? (
            <SectionCard title="Message to the candidate">
              <blockquote className="m-0 border-l-4 border-indigo-200 pl-4 text-[15px] leading-7 whitespace-pre-line text-slate-700">
                {o.message}
              </blockquote>
            </SectionCard>
          ) : null}
          {o.internal_notes ? (
            <SectionCard title="Internal notes" description="Not shown to the candidate">
              <p className="m-0 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                {o.internal_notes}
              </p>
            </SectionCard>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          <SectionCard title="Candidate">
            <CandidateCard
              name={o.application?.candidate.full_name ?? ''}
              subtitle={o.application?.candidate.email}
            />
          </SectionCard>
          <SectionCard title="Timeline">
            <ActivityTimeline entries={timeline} />
          </SectionCard>
        </div>
      </div>

      {o.application ? (
        <OfferFormModal
          open={editing}
          onClose={() => setEditing(false)}
          applicationId={o.application.id}
          candidateName={o.application.candidate.full_name}
          offer={o}
        />
      ) : null}
      <Modal
        title={current?.title}
        open={current !== null}
        okText={current?.ok}
        okButtonProps={{ danger: current?.danger, disabled: current?.required && !note.trim() }}
        confirmLoading={action.isPending}
        onCancel={() => setNoteAction(null)}
        onOk={() => {
          if (!noteAction || !current) return;
          action.mutate(
            { id, action: noteAction, body: { [current.field]: note.trim() || null } },
            {
              onSuccess: () => {
                void message.success(current.done);
                setNoteAction(null);
                setNote('');
              },
              onError,
            },
          );
        }}
        destroyOnHidden
      >
        <Input.TextArea
          aria-label="Note"
          rows={3}
          maxLength={1000}
          placeholder={current?.required ? 'Required' : 'Optional note'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
}
