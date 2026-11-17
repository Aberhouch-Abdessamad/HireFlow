import { LogoutOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useLogout } from '@/features/auth/queries';
import { Brand } from './Brand';

const LINKS = [
  { to: '/candidate/dashboard', label: 'Dashboard' },
  { to: '/candidate/applications', label: 'Applications' },
  { to: '/candidate/documents', label: 'Documents' },
  { to: '/candidate/profile', label: 'Profile' },
];

/** Candidate portal shell: top bar with tab-style navigation. */
export function CandidateLayout() {
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary sm:inline">
              Candidate
            </span>
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            className="!text-slate-500"
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => void navigate('/candidate/login', { replace: true }),
              })
            }
          >
            Sign out
          </Button>
        </div>
        <nav
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 md:px-6"
          aria-label="Candidate portal"
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `border-b-2 px-3 pt-1 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary !text-primary'
                    : 'border-transparent !text-slate-500 hover:!text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
