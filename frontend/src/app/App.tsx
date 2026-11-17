import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './AppProviders';
import { routes } from './router/routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
