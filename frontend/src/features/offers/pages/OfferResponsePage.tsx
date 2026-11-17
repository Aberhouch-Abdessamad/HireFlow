import { CalendarOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { App, Button, Input, Result, Skeleton } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { CompanyLogo } from '@/features/careers/components/CompanyLogo';
import { EMPLOYMENT_TYPE_LABELS } from '@/features/jobs/types';
import { toApiError } from '@/services/apiError';
import { formatDate, formatMoney } from '@/utils/format';
import { fetchOfferByToken, respondByToken } from '../api';
import type { CandidateOffer } from '../types';

/** Public page from the offer email: the candidate reviews and accepts or declines. */
export function OfferResponsePage() {
  const { token = '' } = useParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const key = ['public-offer', token];
  const offer = useQuery({ queryKey: key, queryFn: () => fetchOfferByToken(token), retry: false });
  const respond = useMutation({
    mutationFn: (decision: 'accept' | 'decline') =>
      respondByToken(token, decision, note.trim() || null),
    onSuccess: (updated: CandidateOffer) => queryClient.setQueryData(key, updated),
    onError: (error) => {
      void message.error(toApiError(error).message);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  if (offer.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (offer.isError) {
    return (
      <Result
        status="404"
        title="Offer not found"
        subTitle="This link is invalid or the offer has been withdrawn."
      />
    );
  }

  const o = offer.data;

  if (o.status === 'accepted') {
    return (
      <Result
        status="success"
        title={`Welcome to ${o.company.name}!`}
        subTitle={`You accepted the ${o.job_title} offer. Your start date is ${formatDate(o.start_date)}. The team will be in touch with next steps.`}
      />
    );
  }
  if (o.status === 'rejected') {
    return (
      <Result
        status="info"
        title="You declined this offer"
        subTitle={`Thank you for letting ${o.company.name} know.`}
      />
    );
  }
  if (o.status !== 'sent') {
    return (
      <Result
        status="warning"
        title="This offer is no longer open"
        subTitle="Contact the company if you have questions."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="hf-surface overflow-hidden">
        <div className="border-t-4 border-primary px-8 pt-8 pb-6">
          <div className="flex items-center gap-4">
            <CompanyLogo name={o.company.name} logoUrl={o.company.logo_url} size="lg" />
            <div>
              <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Job offer
              </div>
              <h1 className="m-0 mt-1 text-2xl font-bold text-slate-900">
                Your offer from {o.company.name}
              </h1>
              <div className="mt-0.5 text-sm text-slate-600">{o.job_title}</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <p className="mt-0 text-[15px] text-slate-700">Hello {o.candidate_first_name},</p>
          {o.message ? (
            <p className="text-[15px] leading-7 whitespace-pre-line text-slate-700">{o.message}</p>
          ) : null}

          <div className="my-6 rounded-xl bg-primary p-5 text-white">
            <div className="text-xs font-medium text-white/80">Yearly salary</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(o.salary_amount, o.currency)}
            </div>
          </div>

          <dl className="m-0 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: <FileTextOutlined />,
                label: 'Contract',
                value: EMPLOYMENT_TYPE_LABELS[o.contract_type],
              },
              { icon: <CalendarOutlined />, label: 'Start date', value: formatDate(o.start_date) },
              {
                icon: <ClockCircleOutlined />,
                label: 'Respond by',
                value: formatDate(o.expires_at),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-slate-50/50 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  {item.icon}
                  {item.label}
                </dt>
                <dd className="m-0 mt-1 text-[15px] font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>

          <Input.TextArea
            className="mt-6"
            aria-label="Message to the company"
            rows={3}
            maxLength={1000}
            placeholder="Optional message to the company"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              size="large"
              danger
              loading={respond.isPending && respond.variables === 'decline'}
              onClick={() => respond.mutate('decline')}
            >
              Decline
            </Button>
            <Button
              type="primary"
              size="large"
              loading={respond.isPending && respond.variables === 'accept'}
              onClick={() => respond.mutate('accept')}
            >
              Accept offer
            </Button>
          </div>
        </div>
      </div>
      <p className="m-0 text-center text-xs text-slate-400">
        This link is personal. Please don't share it.
      </p>
    </div>
  );
}
