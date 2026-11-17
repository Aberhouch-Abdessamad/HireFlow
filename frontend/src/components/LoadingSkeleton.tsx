import { Card, Skeleton, Spin } from 'antd';

interface LoadingSkeletonProps {
  variant?: 'page' | 'table' | 'cards';
  rows?: number;
}

export function LoadingSkeleton({ variant = 'page', rows = 5 }: LoadingSkeletonProps) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <Card aria-busy="true">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} active title={false} paragraph={{ rows: 1, width: '100%' }} />
        ))}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton active title paragraph={{ rows: 1 }} />
      <Card>
        <Skeleton active paragraph={{ rows }} />
      </Card>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center" aria-busy="true">
      <Spin size="large" />
    </div>
  );
}
