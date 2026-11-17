import { App, Button, Input } from 'antd';
import { CompanyLogo } from '@/features/careers/components/CompanyLogo';
import { useState } from 'react';
import { EMPLOYMENT_TYPE_LABELS } from '@/features/jobs/types';
import type { CandidateOffer } from '@/features/offers/types';
import { toApiError } from '@/services/apiError';
import { formatDate, formatMoney } from '@/utils/format';
import { useRespondToOffer } from '../queries';

export function OfferCard({ offer }: { offer: CandidateOffer }) {
  const { message, modal } = App.useApp();
  const respond = useRespondToOffer();
  const [note, setNote] = useState('');
  const open = offer.status === 'sent';

  const decide = (decision: 'accept' | 'decline') =>
    modal.confirm({
      title:
        decision === 'accept'
          ? `Accept the offer from ${offer.company.name}?`
          : 'Decline this offer?',
      okText: decision === 'accept' ? 'Accept offer' : 'Decline',
      okButtonProps: { danger: decision === 'decline' },
      onOk: () =>
        respond
          .mutateAsync({ id: offer.id, decision, note: note.trim() || null })
          .then(
            () =>
              void message.success(
                decision === 'accept'
                  ? 'Congratulations! You accepted the offer.'
                  : 'You declined the offer.',
              ),
          )
          .catch((error: unknown) => void message.error(toApiError(error).message)),
    });

  const status =
    offer.status === 'accepted'
      ? { text: 'You accepted this offer.', cls: 'bg-emerald-50 text-emerald-700' }
      : offer.status === 'rejected'
        ? { text: 'You declined this offer.', cls: 'bg-slate-100 text-slate-600' }
        : { text: 'This offer has expired.', cls: 'bg-slate-100 text-slate-600' };

  return (
    <article className="hf-surface overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border-soft bg-primary-soft px-5 py-4">
        <CompanyLogo name={offer.company.name} logoUrl={offer.company.logo_url} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-slate-900">{offer.job_title}</div>
          <div className="text-[13px] text-slate-500">{offer.company.name}</div>
        </div>
      </div>
      <div className="p-5">
        {offer.message ? (
          <p className="mt-0 mb-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {offer.message}
          </p>
        ) : null}
        <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Yearly salary', formatMoney(offer.salary_amount, offer.currency)],
            ['Contract', EMPLOYMENT_TYPE_LABELS[offer.contract_type]],
            ['Start date', formatDate(offer.start_date)],
            ['Respond by', formatDate(offer.expires_at)],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`rounded-xl p-3 ${index === 0 ? 'bg-primary text-white' : 'bg-slate-50'}`}
            >
              <dt className={`text-xs ${index === 0 ? 'text-white/80' : 'text-slate-500'}`}>
                {label}
              </dt>
              <dd
                className={`m-0 mt-0.5 text-[15px] font-semibold ${index === 0 ? 'text-white' : 'text-slate-900'}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {open ? (
          <>
            <Input.TextArea
              className="mt-4"
              aria-label="Message to the company"
              rows={2}
              maxLength={1000}
              placeholder="Optional message to the company"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button danger disabled={respond.isPending} onClick={() => decide('decline')}>
                Decline
              </Button>
              <Button type="primary" loading={respond.isPending} onClick={() => decide('accept')}>
                Accept offer
              </Button>
            </div>
          </>
        ) : (
          <div className={`mt-4 rounded-lg px-3 py-2 text-[13px] font-medium ${status.cls}`}>
            {status.text}
          </div>
        )}
      </div>
    </article>
  );
}
