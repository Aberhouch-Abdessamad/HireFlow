import { CheckCircleFilled } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import { Link, Outlet } from 'react-router';
import { Brand } from './Brand';

const HIGHLIGHTS = [
  {
    title: 'One pipeline for every role',
    text: 'Move candidates through your own stages with a drag-and-drop board.',
  },
  {
    title: 'Structured interviews',
    text: 'Panels, scheduling and blind scorecards so feedback stays objective.',
  },
  {
    title: 'Offers with approvals',
    text: 'Draft, approve and send offers that candidates accept online.',
  },
];

/** Split-screen layout for login, registration and password flows. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="hf-grid-bg relative hidden overflow-hidden bg-[#1E1B4B] p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[480px] w-[480px] rounded-full bg-indigo-500/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-violet-600/30 blur-3xl"
        />
        <Link to="/" className="relative" aria-label="HireFlow home">
          <Brand inverted />
        </Link>
        <div className="relative mt-auto mb-auto max-w-md">
          <h2 className="m-0 text-[34px] leading-[1.15] font-semibold tracking-tight">
            Hire with clarity, from first application to signed offer.
          </h2>
          <p className="mt-4 mb-10 text-[15px] leading-relaxed text-indigo-200">
            HireFlow brings jobs, candidates, interviews and offers into one shared workspace for
            your hiring team.
          </p>
          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <CheckCircleFilled className="mt-0.5 text-lg text-indigo-300" />
                <div>
                  <div className="text-[15px] font-semibold">{item.title}</div>
                  <div className="mt-0.5 text-sm text-indigo-200">{item.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-indigo-300">
          © {new Date().getFullYear()} HireFlow
        </div>
      </aside>

      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <ConfigProvider componentSize="large">
            <Outlet />
          </ConfigProvider>
        </div>
      </main>
    </div>
  );
}
