import { Link, NavLink, Outlet } from 'react-router';
import { Brand } from './Brand';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-16 items-center border-b-[3px] px-1 text-sm font-bold !no-underline ${
    isActive
      ? 'border-primary !text-slate-900'
      : 'border-transparent !text-slate-700 hover:border-slate-300'
  }`;

/** Layout for public pages (careers site, system status): job-board style top bar. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
          <div className="flex items-center gap-8">
            <Link to="/careers" aria-label="HireFlow careers" className="!no-underline">
              <Brand />
            </Link>
            <nav className="hidden gap-6 sm:flex" aria-label="Public">
              <NavLink to="/careers" className={navClass}>
                Find jobs
              </NavLink>
            </nav>
          </div>
          <nav className="flex items-center gap-4 text-sm" aria-label="Account">
            <Link to="/candidate/login" className="font-bold !text-primary">
              Sign in
            </Link>
            <span aria-hidden="true" className="h-6 w-px bg-border" />
            <Link to="/login" className="font-bold !text-slate-800">
              Employers / Post job
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row md:px-8">
          <span>© {new Date().getFullYear()} HireFlow</span>
          <span className="flex gap-5">
            <Link to="/careers">Browse jobs</Link>
            <Link to="/candidate/register">Create a candidate account</Link>
            <Link to="/register">Hire with HireFlow</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
