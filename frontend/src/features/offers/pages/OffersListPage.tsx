import { Input, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CandidateCard } from '@/components/CandidateCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { toOptions } from '@/features/jobs/types';
import { formatDate, formatMoney } from '@/utils/format';
import { OfferStatusBadge } from '../components/OfferStatusBadge';
import { useOffers } from '../queries';
import { OFFER_STATUS_LABELS, type Offer, type OfferStatus } from '../types';

export function OffersListPage() {
  const [page, setPage] = useState(1);
  const [params] = useSearchParams();
  // Deep links such as /offers?status=pending_approval open pre-filtered.
  const initialStatus = params.get('status');
  const [status, setStatus] = useState<OfferStatus | undefined>(
    initialStatus && initialStatus in OFFER_STATUS_LABELS
      ? (initialStatus as OfferStatus)
      : undefined,
  );
  const [search, setSearch] = useState('');
  const offers = useOffers({ page, per_page: 20, status, search: search || undefined });

  const columns: TableProps<Offer>['columns'] = [
    {
      title: 'Candidate',
      key: 'candidate',
      render: (_, o) => (
        <Link to={`/offers/${o.id}`} className="!text-inherit">
          <CandidateCard
            size="small"
            name={o.application?.candidate.full_name ?? ''}
            subtitle={o.application?.job.title}
          />
        </Link>
      ),
    },
    {
      title: 'Salary',
      key: 'salary',
      width: 160,
      render: (_, o) => (
        <span className="font-semibold whitespace-nowrap text-slate-900 tabular-nums">
          {formatMoney(o.salary_amount, o.currency)}
        </span>
      ),
    },
    {
      title: 'Start',
      key: 'start',
      width: 130,
      render: (_, o) => (
        <span className="whitespace-nowrap text-slate-600">{formatDate(o.start_date)}</span>
      ),
    },
    {
      title: 'Respond by',
      key: 'expires',
      width: 130,
      render: (_, o) => (
        <span className="whitespace-nowrap text-slate-600">{formatDate(o.expires_at)}</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, o) => <OfferStatusBadge status={o.status} />,
    },
    {
      title: 'Created by',
      key: 'created_by',
      width: 160,
      render: (_, o) =>
        o.created_by ? (
          <span className="flex items-center gap-2 text-[13px]">
            <UserAvatar name={o.created_by.name} size="xs" />
            <span className="truncate">{o.created_by.name}</span>
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Offers"
        description="Draft, approve, send and track employment offers. Create offers from an application."
      />
      <div className="hf-surface overflow-hidden">
        <div className="hf-toolbar">
          <Input.Search
            allowClear
            aria-label="Search offers"
            placeholder="Candidate name"
            onSearch={(v) => {
              setSearch(v.trim());
              setPage(1);
            }}
            style={{ width: 240 }}
          />
          <Select<OfferStatus>
            allowClear
            aria-label="Filter by status"
            placeholder="All statuses"
            style={{ width: 180 }}
            value={status}
            options={toOptions(OFFER_STATUS_LABELS)}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </div>
        {offers.isError ? (
          <ErrorState error={offers.error} onRetry={() => void offers.refetch()} />
        ) : (
          <Table<Offer>
            rowKey="id"
            columns={columns}
            dataSource={offers.data?.data ?? []}
            loading={offers.isFetching}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <EmptyState
                  compact
                  title="No offers yet"
                  description="Create an offer from an application once a candidate is ready."
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize: 20,
              total: offers.data?.meta.total ?? 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
          />
        )}
      </div>
    </>
  );
}
