import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authKeys } from '@/features/auth/queries';
import { makeUser } from '@/test/fixtures';
import { createTestQueryClient, renderWithProviders } from '@/test/utils';
import type { Permission } from '@/types/permissions';
import * as api from '../api';
import type { Offer } from '../types';
import { OfferDetailPage } from './OfferDetailPage';

vi.mock('../api');

const offer = (status: Offer['status']): Offer => ({
  id: 5,
  status,
  status_label: status,
  salary_amount: 65000,
  currency: 'EUR',
  contract_type: 'full_time',
  start_date: '2026-12-15',
  expires_at: '2026-11-30T23:59:59Z',
  message: null,
  internal_notes: 'Budget approved',
  approval_comment: null,
  response_note: null,
  application: {
    id: 9,
    status: 'active',
    job: { id: 1, title: 'Backend Engineer' },
    candidate: { id: 3, full_name: 'Lina Haddad', email: 'lina@example.test' },
  },
  created_by: { id: 2, name: 'Rami Recruiter' },
  approved_by: null,
  submitted_at: null,
  approved_at: null,
  sent_at: null,
  responded_at: null,
  created_at: '2026-11-10T10:00:00Z',
});

function renderAs(status: Offer['status'], permissions: Permission[]) {
  vi.mocked(api.fetchOffer).mockResolvedValue(offer(status));
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(authKeys.me(), makeUser({ permissions }));
  renderWithProviders(
    <Routes>
      <Route path="/offers/:id" element={<OfferDetailPage />} />
    </Routes>,
    { route: '/offers/5', queryClient },
  );
}

describe('OfferDetailPage actions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('lets recruiters submit drafts but not approve', async () => {
    renderAs('draft', ['offers.view', 'offers.create']);
    expect(await screen.findByRole('button', { name: 'Submit for approval' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows approval actions to approvers', async () => {
    renderAs('pending_approval', ['offers.view', 'offers.approve']);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
  });

  it('only users who can send see the send button', async () => {
    renderAs('approved', ['offers.view', 'offers.create']);
    expect(await screen.findByText('Budget approved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send to candidate' })).not.toBeInTheDocument();
  });
});
