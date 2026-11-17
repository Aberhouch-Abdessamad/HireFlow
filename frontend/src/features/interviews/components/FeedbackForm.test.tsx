import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import * as api from '../api';
import { FeedbackForm } from './FeedbackForm';

vi.mock('../api');

describe('FeedbackForm', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requires every score and a recommendation', async () => {
    renderWithProviders(<FeedbackForm interviewId={1} />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));

    expect(await screen.findAllByText('Rate from 1 to 5.')).toHaveLength(4);
    expect(screen.getByText('Choose a recommendation.')).toBeInTheDocument();
    expect(api.submitFeedback).not.toHaveBeenCalled();
  });
});
