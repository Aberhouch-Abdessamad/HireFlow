import {
  ArrowLeftOutlined,
  BankOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  LinkedinOutlined,
  LinkOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { App, Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FileUploader } from '@/components/FileUploader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { NotesPanel } from '@/components/NotesPanel';
import { SectionCard } from '@/components/SectionCard';
import { UserAvatar } from '@/components/UserAvatar';
import { stageAccent } from '@/features/applications/components/stageColors';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import { SOURCE_LABELS } from '@/features/applications/types';
import { usePermissions } from '@/hooks/usePermission';
import { toApiError } from '@/services/apiError';
import { formatDate } from '@/utils/format';
import { downloadDocument } from '../api';
import { AddToJobModal } from '../components/AddToJobModal';
import { CandidateFormDrawer } from '../components/CandidateFormDrawer';
import {
  useAddCandidateNote,
  useCandidate,
  useCandidateApplications,
  useCandidateDocuments,
  useCandidateNotes,
  useDeleteCandidate,
} from '../queries';

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function period(start: string | null, end: string | null, current = false): string {
  const fmt = (v: string) => dayjs(v).format('MMM YYYY');
  return [start ? fmt(start) : '?', current ? 'Present' : end ? fmt(end) : '?'].join(' – ');
}

function ContactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2 text-[13px] text-slate-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

export function CandidateDetailPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const { can } = usePermissions();
  const candidate = useCandidate(id);
  const applications = useCandidateApplications(id);
  const notes = useCandidateNotes(id);
  const addNote = useAddCandidateNote(id);
  const documents = useCandidateDocuments(id);
  const remove = useDeleteCandidate();
  const [editing, setEditing] = useState(false);
  const [addingToJob, setAddingToJob] = useState(false);

  if (candidate.isPending) return <LoadingSkeleton rows={8} />;
  if (candidate.isError)
    return <ErrorState error={candidate.error} onRetry={() => void candidate.refetch()} />;

  const c = candidate.data;
  const canUpdate = can('candidates.update');
  const onError = (error: unknown) => void message.error(toApiError(error).message);

  const actions = (
    <>
      {can('candidates.delete') ? (
        <Popconfirm
          title="Delete this candidate?"
          description="Their profile is removed from your talent pool. Application history is kept."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() =>
            remove.mutate(id, {
              onSuccess: () => {
                void message.success('Candidate deleted.');
                void navigate('/candidates');
              },
              onError,
            })
          }
        >
          <Button danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ) : null}
      {canUpdate ? (
        <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
          Edit
        </Button>
      ) : null}
      {can('applications.update_stage') ? (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddingToJob(true)}>
          Add to job
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <Link
        to="/candidates"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium !text-slate-500 hover:!text-primary"
      >
        <ArrowLeftOutlined className="text-[11px]" />
        Candidates
      </Link>

      <section className="hf-surface mb-6 overflow-hidden">
        <div className="h-24 bg-primary" />
        <div className="px-6 pb-6">
          <UserAvatar name={c.full_name} size="xl" className="relative -mt-10 ring-4 ring-white" />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900">
                {c.full_name}
              </h1>
              {c.headline ? <p className="mt-1 mb-0 text-sm text-slate-600">{c.headline}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
                {c.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <EnvironmentOutlined /> {c.location}
                  </span>
                ) : null}
                <span>Source: {SOURCE_LABELS[c.source]}</span>
                <span>Added {formatDate(c.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            title="Applications"
            extra={
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {(applications.data ?? []).length}
              </span>
            }
            flush
          >
            {applications.isPending ? (
              <LoadingSkeleton rows={2} />
            ) : (applications.data ?? []).length === 0 ? (
              <EmptyState compact title="Not applied to any job yet" />
            ) : (
              <ul className="m-0 list-none divide-y divide-border-soft p-0">
                {(applications.data ?? []).map((application) => (
                  <li key={application.id}>
                    <Link
                      to={`/applications/${application.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 !text-inherit hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {application.job?.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${stageAccent(application.stage?.type).dot}`}
                          />
                          {application.stage?.name} · applied {formatDate(application.applied_at)}
                        </span>
                      </span>
                      <ApplicationStatusBadge status={application.status} />
                      <RightOutlined className="text-xs text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Experience">
            {c.experiences && c.experiences.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-5 p-0">
                {c.experiences.map((e) => (
                  <li key={e.id} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
                      {e.company_name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                      <div className="text-[13px] text-slate-600">{e.company_name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {period(e.start_date, e.end_date, e.is_current)}
                      </div>
                      {e.description ? (
                        <p className="mt-2 mb-0 text-[13px] leading-relaxed whitespace-pre-line text-slate-600">
                          {e.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState compact title="No experience recorded" />
            )}
          </SectionCard>

          <SectionCard title="Education">
            {c.educations && c.educations.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {c.educations.map((e) => (
                  <li key={e.id} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <BankOutlined />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{e.institution}</div>
                      <div className="text-[13px] text-slate-600">
                        {[e.degree, e.field_of_study].filter(Boolean).join(', ')}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {period(e.start_date, e.end_date)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="No education recorded" />
            )}
          </SectionCard>

          <NotesPanel
            title="Internal notes"
            notes={notes.data}
            loading={notes.isPending}
            canWrite={canUpdate}
            onAdd={(body) => addNote.mutateAsync(body)}
          />
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Contact">
            <ul className="m-0 -my-2 list-none p-0">
              <ContactRow icon={<MailOutlined />}>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </ContactRow>
              {c.phone ? <ContactRow icon={<PhoneOutlined />}>{c.phone}</ContactRow> : null}
              {c.linkedin_url ? (
                <ContactRow icon={<LinkedinOutlined />}>
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer">
                    LinkedIn profile
                  </a>
                </ContactRow>
              ) : null}
              {c.portfolio_url ? (
                <ContactRow icon={<LinkOutlined />}>
                  <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer">
                    Portfolio
                  </a>
                </ContactRow>
              ) : null}
            </ul>
          </SectionCard>

          <SectionCard title="Skills & tags">
            {(c.skills ?? []).length === 0 && (c.tags ?? []).length === 0 ? (
              <span className="text-sm text-slate-500">No skills or tags yet.</span>
            ) : (
              <div className="flex flex-col gap-4">
                {(c.skills ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills ?? []).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-primary-soft px-2.5 py-1 text-[13px] font-medium text-indigo-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
                {(c.tags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(c.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Documents"
            extra={
              canUpdate ? (
                <FileUploader
                  accept=".pdf,.docx"
                  mimeTypes={[
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  ]}
                  maxSizeMb={5}
                  label="Upload CV"
                  onUpload={async (file) => {
                    await documents.upload.mutateAsync(file);
                    void message.success('Document uploaded.');
                  }}
                />
              ) : null
            }
          >
            {c.documents && c.documents.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {c.documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                        d.mime_type === 'application/pdf'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      {d.mime_type === 'application/pdf' ? (
                        <FilePdfOutlined />
                      ) : (
                        <FileWordOutlined />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-medium text-slate-900">
                        {d.original_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatSize(d.size)} · {formatDate(d.created_at)}
                      </span>
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      aria-label={`Download ${d.original_name}`}
                      onClick={() => void downloadDocument(d).catch(onError)}
                    />
                    {canUpdate ? (
                      <Popconfirm
                        title="Delete this document?"
                        onConfirm={() => documents.remove.mutate(d.id, { onError })}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`Delete ${d.original_name}`}
                        />
                      </Popconfirm>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="No documents" description="Upload a CV in PDF or Word." />
            )}
          </SectionCard>
        </div>
      </div>

      <CandidateFormDrawer
        open={editing}
        candidate={c}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
      <AddToJobModal
        candidateId={id}
        excludeJobIds={(applications.data ?? []).map((a) => a.job?.id ?? 0)}
        open={addingToJob}
        onClose={() => setAddingToJob(false)}
      />
    </>
  );
}
