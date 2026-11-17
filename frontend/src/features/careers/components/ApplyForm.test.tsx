import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import * as api from '../api';
import { applySchema } from '../schemas';
import { ApplyForm } from './ApplyForm';

vi.mock('../api');

describe('ApplyForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requires a CV and consent before submitting', async () => {
    renderWithProviders(<ApplyForm slug="backend-engineer-abc" companyName="Acme" />);

    await userEvent.type(screen.getByLabelText('First name'), 'Sara');
    await userEvent.type(screen.getByLabelText('Last name'), 'Benali');
    await userEvent.type(screen.getByLabelText('Email'), 'sara@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('Attach your CV.')).toBeInTheDocument();
    expect(screen.getByText('Please agree to continue.')).toBeInTheDocument();
    expect(api.applyToJob).not.toHaveBeenCalled();
  });

  it('rejects unsupported and oversized CV files', () => {
    const base = {
      first_name: 'A',
      last_name: 'B',
      email: 'a@example.test',
      phone: '',
      linkedin_url: '',
      cover_letter: '',
      consent: true,
      website: '',
    };
    const exe = new File(['x'], 'cv.exe', { type: 'application/x-msdownload' });
    const huge = new File([new Uint8Array(6 * 1024 * 1024)], 'cv.pdf', { type: 'application/pdf' });

    expect(applySchema.safeParse({ ...base, cv: exe }).success).toBe(false);
    expect(applySchema.safeParse({ ...base, cv: huge }).success).toBe(false);
    expect(
      applySchema.safeParse({
        ...base,
        cv: new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }),
      }).success,
    ).toBe(true);
  });
});
