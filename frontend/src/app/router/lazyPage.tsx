import { lazy, Suspense, type ComponentType } from 'react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

/** Lazy-loads a named page export, so each page becomes its own JS chunk. */
export function lazyPage<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  exportName: keyof M & string,
) {
  const Component = lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType };
  });

  return function LazyPage() {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <Component />
      </Suspense>
    );
  };
}
