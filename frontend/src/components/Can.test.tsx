import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authKeys } from '@/features/auth/queries';
import { makeUser } from '@/test/fixtures';
import { createTestQueryClient, renderWithProviders } from '@/test/utils';
import { Can } from './Can';

describe('<Can>', () => {
  it('renders children when the user has the permission', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(authKeys.me(), makeUser());

    renderWithProviders(
      <Can permission="jobs.view">
        <span>visible</span>
      </Can>,
      { queryClient },
    );

    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  it('renders the fallback when the permission is missing', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(authKeys.me(), makeUser());

    renderWithProviders(
      <Can permission="jobs.publish" fallback={<span>hidden</span>}>
        <span>visible</span>
      </Can>,
      { queryClient },
    );

    expect(screen.queryByText('visible')).not.toBeInTheDocument();
    expect(screen.getByText('hidden')).toBeInTheDocument();
  });
});
