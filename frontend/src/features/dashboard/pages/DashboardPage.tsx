import { Segmented } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { usePermissions } from '@/hooks/usePermission';
import { EmployerDashboard } from '../components/EmployerDashboard';
import { PeriodPicker } from '../components/PeriodPicker';
import { RecruiterDashboard } from '../components/RecruiterDashboard';
import type { PeriodParams } from '../types';

type View = 'company' | 'mine';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Role-aware home.
 * - Company Admins and HR Managers land on the company view and can switch to "My work".
 * - Recruiters get their personal workspace.
 * The API enforces what each role may see; this only chooses the layout.
 */
export function DashboardPage() {
  const { user, can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [preset, setPreset] = useState<string>('30');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const roles = user?.roles ?? [];
  const isEmployer =
    roles.includes('company_admin') ||
    roles.includes('hr_manager') ||
    roles.includes('super_admin');
  const canUseWorkspace = can('applications.view');
  const view: View = !isEmployer
    ? 'mine'
    : params.get('view') === 'mine' && canUseWorkspace
      ? 'mine'
      : 'company';

  const period: PeriodParams = useMemo(() => {
    if (preset === 'custom' && range?.[0] && range?.[1]) {
      return {
        range: 'custom',
        from: range[0].startOf('day').toISOString(),
        to: range[1].endOf('day').toISOString(),
      };
    }
    return { range: (preset === 'custom' ? '30' : preset) as PeriodParams['range'] };
  }, [preset, range]);

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <>
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="m-0 text-[13px] font-medium text-slate-500">
            {dayjs().format('dddd, MMMM D')}
            {user?.current_company ? ` · ${user.current_company.name}` : ''}
          </p>
          <h1 className="m-0 mt-1 text-[30px] leading-tight font-semibold tracking-tight text-slate-900">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isEmployer && canUseWorkspace ? (
            <Segmented<View>
              aria-label="Dashboard view"
              value={view}
              onChange={(next) =>
                setParams(next === 'mine' ? { view: 'mine' } : {}, { replace: true })
              }
              options={[
                { value: 'company', label: 'Company' },
                { value: 'mine', label: 'My work' },
              ]}
            />
          ) : null}
          {view === 'company' ? (
            <PeriodPicker
              preset={preset}
              onPresetChange={setPreset}
              allowCustom
              range={range}
              onRangeChange={setRange}
            />
          ) : null}
        </div>
      </header>
      {view === 'company' ? <EmployerDashboard params={period} /> : <RecruiterDashboard />}
    </>
  );
}
