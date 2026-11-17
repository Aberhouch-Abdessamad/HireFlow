import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { authKeys } from '@/features/auth/queries';
import { makeUser } from '@/test/fixtures';
import { createTestQueryClient, renderWithProviders } from '@/test/utils';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(user: ReturnType<typeof makeUser> | null) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(authKeys.me(), user);
  return renderWithProviders(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/secret" element={<p>Secret area</p>} />
      </Route>
      <Route path="/login" element={<p>Login screen</p>} />
    </Routes>,
    { route: '/secret', queryClient },
  );
}

describe('ProtectedRoute', () => {
  it('redirects guests to the login page', () => {
    renderAt(null);
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('blocks users without an active company', () => {
    renderAt(makeUser({ current_company: null }));
    expect(screen.getByText('No active company')).toBeInTheDocument();
  });

  it('renders the page for verified members', () => {
    renderAt(makeUser());
    expect(screen.getByText('Secret area')).toBeInTheDocument();
  });
});

describe('ProtectedRoute for candidate accounts', () => {
  it('sends candidates to their portal', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      authKeys.me(),
      makeUser({ is_candidate: true, current_company: null, permissions: [], roles: [] }),
    );
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<p>Secret area</p>} />
        </Route>
        <Route path="/candidate/dashboard" element={<p>Candidate portal</p>} />
      </Routes>,
      { route: '/secret', queryClient },
    );
    expect(screen.getByText('Candidate portal')).toBeInTheDocument();
  });
});
