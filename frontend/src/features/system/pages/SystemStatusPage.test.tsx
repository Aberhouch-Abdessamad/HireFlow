import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/apiError';
import { renderWithProviders } from '@/test/utils';
import * as api from '../api';
import { SystemStatusPage } from './SystemStatusPage';

vi.mock('../api');

describe('SystemStatusPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows API health and CSRF status', async () => {
    vi.mocked(api.fetchHealth).mockResolvedValue({
      status: 'ok',
      api_version: 'v1',
      server_time: '2026-11-17T10:00:00Z',
      checks: { database: 'ok' },
    });
    vi.mocked(api.checkCsrfCookie).mockResolvedValue(true);

    renderWithProviders(<SystemStatusPage />);

    expect(await screen.findByText('v1')).toBeInTheDocument();
    expect(screen.getByText('received')).toBeInTheDocument();
  });

  it('shows a friendly error when the API is unreachable', async () => {
    vi.mocked(api.fetchHealth).mockRejectedValue(
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Unable to reach the server.' }),
    );
    vi.mocked(api.checkCsrfCookie).mockResolvedValue(false);

    renderWithProviders(<SystemStatusPage />);

    expect(await screen.findByText('Unable to reach the server.')).toBeInTheDocument();
    expect(screen.getByText('missing')).toBeInTheDocument();
  });
});
