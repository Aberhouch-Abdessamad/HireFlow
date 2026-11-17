import { App, Button, Input, Skeleton } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import { toApiError } from '@/services/apiError';
import { EmptyState } from './EmptyState';
import { SectionCard } from './SectionCard';
import { UserAvatar } from './UserAvatar';

dayjs.extend(relativeTime);

export interface NoteItem {
  id: number;
  body: string;
  author?: { id: number; name: string } | null;
  created_at: string | null;
}

interface NotesPanelProps {
  title: string;
  notes: NoteItem[] | undefined;
  loading: boolean;
  canWrite: boolean;
  placeholder?: string;
  onAdd: (body: string) => Promise<unknown>;
}

/** Internal notes and comments. Bodies are shown as plain text (never HTML). */
export function NotesPanel({
  title,
  notes,
  loading,
  canWrite,
  placeholder,
  onAdd,
}: NotesPanelProps) {
  const { message } = App.useApp();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = body.trim();
    if (!value) return;
    setSaving(true);
    try {
      await onAdd(value);
      setBody('');
    } catch (error) {
      void message.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title={title}
      extra={
        notes && notes.length > 0 ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {notes.length}
          </span>
        ) : null
      }
    >
      {canWrite ? (
        <div className="mb-5 rounded-xl border border-border bg-slate-50/60 p-2 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
          <Input.TextArea
            aria-label={`Add to ${title.toLowerCase()}`}
            variant="borderless"
            autoSize={{ minRows: 2, maxRows: 8 }}
            maxLength={5000}
            placeholder={placeholder ?? 'Write a note visible to your team…'}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-xs text-slate-400">Visible to your hiring team only</span>
            <Button
              type="primary"
              size="small"
              loading={saving}
              disabled={!body.trim()}
              onClick={() => void submit()}
            >
              Add
            </Button>
          </div>
        </div>
      ) : null}
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : !notes || notes.length === 0 ? (
        <EmptyState compact title="No comments yet" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {notes.map((note) => (
            <li key={note.id} className="flex gap-3">
              <UserAvatar name={note.author?.name ?? 'Former member'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-slate-900">
                    {note.author?.name ?? 'Former member'}
                  </span>
                  <span className="text-xs text-slate-400" title={note.created_at ?? undefined}>
                    {note.created_at ? dayjs(note.created_at).fromNow() : ''}
                  </span>
                </div>
                <p className="mt-1 mb-0 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {note.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
