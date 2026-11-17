import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import type { Application, PipelineColumn } from '../types';
import { PipelineBoard } from './PipelineBoard';

const app = (id: number, name: string, stageId: number): Application => ({
  id,
  status: 'active',
  source: 'careers_page',
  cover_letter: null,
  stage: { id: stageId, name: 'Applied', type: 'applied' },
  job: { id: 1, title: 'Backend Engineer', status: 'published' },
  candidate: { id, full_name: name, email: `${id}@example.test`, headline: null, location: null },
  assignee: null,
  rejection: null,
  applied_at: '2026-11-01T00:00:00Z',
  stage_entered_at: '2026-11-10T00:00:00Z',
  hired_at: null,
});

const columns: PipelineColumn[] = [
  {
    stage: { id: 1, name: 'Applied', type: 'applied', position: 1, is_system: true },
    applications: [app(10, 'Lina Haddad', 1)],
  },
  {
    stage: { id: 2, name: 'Interview', type: 'interview', position: 2, is_system: false },
    applications: [],
  },
  {
    stage: { id: 3, name: 'Hired', type: 'hired', position: 3, is_system: true },
    applications: [],
  },
];

describe('PipelineBoard', () => {
  it('renders stage columns with counts', () => {
    renderWithProviders(<PipelineBoard columns={columns} canMove showJob onMove={vi.fn()} />);

    expect(screen.getByRole('listitem', { name: 'Applied: 1 candidates' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Interview: 0 candidates' })).toBeInTheDocument();
  });

  it('moves a card with the accessible menu, never directly to Hired', async () => {
    const onMove = vi.fn();
    renderWithProviders(<PipelineBoard columns={columns} canMove showJob onMove={onMove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Move Lina Haddad' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByText('Move to Hired')).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByText('Move to Interview'));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), 2);
  });

  it('hides move controls without permission', () => {
    renderWithProviders(
      <PipelineBoard columns={columns} canMove={false} showJob onMove={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Move Lina Haddad' })).not.toBeInTheDocument();
  });
});
