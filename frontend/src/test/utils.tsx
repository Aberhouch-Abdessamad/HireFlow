import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/AppProviders';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', queryClient = createTestQueryClient(), ...rest } = options;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </AppProviders>
  );
  return { queryClient, ...render(ui, { wrapper, ...rest }) };
}
