import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/apiError';
import { renderWithProviders } from '@/test/utils';
import * as api from '../api';
import { LoginPage } from './LoginPage';

vi.mock('../api');

function renderLogin(route = '/login') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/two-factor-challenge" element={<p>2FA screen</p>} />
      <Route path="/company/members" element={<p>Members screen</p>} />
      <Route path="/" element={<p>Home screen</p>} />
    </Routes>,
    { route },
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(null);
  });

  it('validates fields before calling the API', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('shows server validation errors on the field', async () => {
    vi.mocked(api.login).mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Invalid',
        fieldErrors: { email: ['These credentials do not match our records.'] },
      }),
    );
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'ada@acme.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('These credentials do not match our records.'),
    ).toBeInTheDocument();
  });

  it('goes to the two-factor challenge when required', async () => {
    vi.mocked(api.login).mockResolvedValue({ twoFactor: true });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'ada@acme.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ngPassword');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('2FA screen')).toBeInTheDocument();
  });

  it('redirects to a safe internal path after sign-in and ignores external ones', async () => {
    vi.mocked(api.login).mockResolvedValue({ twoFactor: false });
    renderLogin('/login?redirect=/company/members');

    await userEvent.type(screen.getByLabelText('Email'), 'ada@acme.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ngPassword');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Members screen')).toBeInTheDocument());
  });
});
