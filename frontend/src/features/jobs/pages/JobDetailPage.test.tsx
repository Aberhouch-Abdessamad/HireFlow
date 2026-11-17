import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authKeys } from '@/features/auth/queries';
import { makeUser } from '@/test/fixtures';
import { makeJob } from '@/test/jobFixtures';
import { createTestQueryClient, renderWithProviders } from '@/test/utils';
import type { Permission } from '@/types/permissions';
import * as api from '../api';
import { JobDetailPage } from './JobDetailPage';

vi.mock('../api');

function renderPage(permissions: Permission[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(authKeys.me(), makeUser({ permissions }));
  return renderWithProviders(
    <Routes>
      <Route path="/jobs/:id" element={<JobDetailPage />} />
    </Routes>,
    { route: '/jobs/7', queryClient },
  );
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchJob).mockResolvedValue(makeJob());
  });

  it('shows lifecycle and management actions to users with permission', async () => {
    renderPage(['jobs.view', 'jobs.update', 'jobs.publish', 'jobs.delete']);

    expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
  });

  it('hides actions the user is not allowed to perform', async () => {
    renderPage(['jobs.view']);

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  it('publishes the job and shows the new status', async () => {
    vi.mocked(api.transitionJob).mockResolvedValue(
      makeJob({
        status: 'published',
        available_transitions: ['paused', 'closed'],
        is_deletable: false,
      }),
    );
    renderPage(['jobs.view', 'jobs.publish']);

    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(api.transitionJob).toHaveBeenCalledWith(7, 'publish');
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });
});
