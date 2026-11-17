import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { useEffect, useState, type ReactNode } from 'react';
import { authKeys } from '@/features/auth/queries';
import { onUnauthenticated } from '@/services/http';
import { createQueryClient } from './queryClient';
import { antdTheme } from './theme';

interface AppProvidersProps {
  children: ReactNode;
  /** Lets tests inject an isolated client. */
  queryClient?: QueryClient;
}

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());

  // Any 401 means the session is gone: mark the user as signed out so guards redirect to /login.
  useEffect(() => {
    onUnauthenticated(() => client.setQueryData(authKeys.me(), null));
    return () => onUnauthenticated(null);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={enUS}>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  );
}
