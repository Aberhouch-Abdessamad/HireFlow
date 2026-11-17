import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Can } from '@/components/Can';
import { CandidateCard } from '@/components/CandidateCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { SOURCE_LABELS } from '@/features/applications/types';
import { formatDate } from '@/utils/format';
import { CandidateFormDrawer } from '../components/CandidateFormDrawer';
import { useCandidates, useTags } from '../queries';
import type { Candidate } from '../types';

export function CandidatesListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tags = useTags();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const page = Number(params.get('page') ?? '1') || 1;
  const search = params.get('search') ?? '';
  const tag = params.get('tag') ?? undefined;
  const [searchInput, setSearchInput] = useState(search);

  const candidates = useCandidates({ page, per_page: 20, search: search || undefined, tag });

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const columns: TableProps<Candidate>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_, c) => (
        <Link to={`/candidates/${c.id}`} className="!text-inherit">
          <CandidateCard name={c.full_name} subtitle={c.headline ?? c.email} size="small" />
        </Link>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      width: 170,
      render: (v: string | null) => <span className="text-slate-600">{v ?? '—'}</span>,
    },
    {
      title: 'Tags',
      key: 'tags',
      width: 220,
      render: (_, c) => (
        <span className="flex flex-wrap gap-1">
          {(c.tags ?? []).map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {t}
            </span>
          ))}
        </span>
      ),
    },
    {
      title: 'Applications',
      dataIndex: 'applications_count',
      width: 120,
      align: 'center',
      render: (count: number | undefined) => (
        <span className="inline-flex min-w-7 justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
          {count ?? 0}
        </span>
      ),
    },
    { title: 'Source', key: 'source', width: 140, render: (_, c) => SOURCE_LABELS[c.source] },
    { title: 'Added', key: 'created_at', width: 130, render: (_, c) => formatDate(c.created_at) },
  ];

  const empty = candidates.isSuccess && candidates.data.meta.total === 0 && !search && !tag;

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Candidates"
        description="Your company's talent pool."
        actions={
          <Can permission="candidates.create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Add candidate
            </Button>
          </Can>
        }
      />
      <div className="hf-surface overflow-hidden">
        <div className="hf-toolbar">
          <Input.Search
            allowClear
            aria-label="Search candidates"
            placeholder="Name, email or headline"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={(value) => update({ search: value.trim() || undefined })}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            showSearch
            aria-label="Filter by tag"
            placeholder="All tags"
            style={{ width: 200 }}
            value={tag}
            options={(tags.data ?? []).map((t) => ({ value: t.name, label: t.name }))}
            onChange={(value: string | undefined) => update({ tag: value })}
          />
        </div>
        {candidates.isError ? (
          <ErrorState error={candidates.error} onRetry={() => void candidates.refetch()} />
        ) : empty ? (
          <EmptyState
            title="No candidates yet"
            description="Candidates appear here when they apply on your careers page, or you can add them manually."
          />
        ) : (
          <Table<Candidate>
            rowKey="id"
            columns={columns}
            dataSource={candidates.data?.data ?? []}
            loading={candidates.isFetching}
            scroll={{ x: 900 }}
            locale={{ emptyText: <EmptyState compact title="No candidates match your filters." /> }}
            pagination={{
              current: page,
              pageSize: 20,
              total: candidates.data?.meta.total ?? 0,
              showSizeChanger: false,
              onChange: (next) => update({ page: next }),
            }}
          />
        )}
      </div>
      <CandidateFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={(candidate) => {
          setDrawerOpen(false);
          void navigate(`/candidates/${candidate.id}`);
        }}
      />
    </>
  );
}
