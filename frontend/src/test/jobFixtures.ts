import type { JobPosting } from '@/features/jobs/types';

export function makeJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 7,
    slug: 'backend-engineer-abc123',
    title: 'Backend Engineer',
    description: 'Build APIs.',
    requirements: null,
    location: 'Casablanca',
    work_mode: 'hybrid',
    employment_type: 'full_time',
    experience_level: 'senior',
    salary: { min: 50000, max: 70000, currency: 'EUR', visible: true },
    status: 'draft',
    available_transitions: ['published', 'archived'],
    is_editable: true,
    is_deletable: true,
    department: { id: 1, name: 'Engineering' },
    recruiters: [{ id: 3, name: 'Rami Recruiter' }],
    skills: [{ id: 1, name: 'Laravel', is_required: true }],
    created_by: 'Hana HR',
    published_at: null,
    expires_at: null,
    closed_at: null,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}
