import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router';
import { Brand } from '@/layouts/Brand';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <Brand />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-[120px] leading-none font-bold tracking-tighter text-primary">404</div>
        <h1 className="mt-4 mb-0 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 mb-8 max-w-sm text-[15px] text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button
          type="primary"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => void navigate('/')}
        >
          Back to home
        </Button>
      </div>
    </div>
  );
}
