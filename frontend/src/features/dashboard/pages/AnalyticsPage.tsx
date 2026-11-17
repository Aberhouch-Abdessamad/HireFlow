import { ClockCircleOutlined, FundOutlined, TrophyOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColors } from '@/app/theme';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { StatCard } from '@/components/StatCard';
import { UserAvatar } from '@/components/UserAvatar';
import { ChartLegend, ChartTooltip } from '../components/ChartTooltip';
import { axisProps, monthLabel } from '../components/chartStyles';
import { PeriodPicker } from '../components/PeriodPicker';
import {
  useApplicationsSeries,
  useHiringFunnel,
  useJobsAnalytics,
  useRecruiterPerformance,
  useTimeToHire,
} from '../queries';
import type { PeriodParams } from '../types';

const APPLICATION_SERIES = [
  { key: 'applications', label: 'Applications', color: chartColors[0] },
  { key: 'hired', label: 'Hired', color: chartColors[2] },
  { key: 'rejected', label: 'Rejected', color: chartColors[1] },
] as const;

const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());

function ChartPlaceholder({ height = 280 }: { height?: number }) {
  return <div className="animate-pulse rounded-xl bg-slate-50" style={{ height }} />;
}

function Chips({ entries }: { entries: [string, number][] }) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
        >
          {humanize(key)}
          <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [preset, setPreset] = useState<string>('30');
  const params: PeriodParams = useMemo(
    () => ({ range: preset as PeriodParams['range'] }),
    [preset],
  );

  const applications = useApplicationsSeries(params);
  const funnel = useHiringFunnel(params);
  const jobs = useJobsAnalytics(params);
  const recruiters = useRecruiterPerformance(params);
  const timeToHire = useTimeToHire(params);

  const applicationData = (applications.data ?? []).map((row) => ({
    ...row,
    label: monthLabel(row.month),
  }));
  const timeToHireMonths = (timeToHire.data?.per_month ?? []).map((row) => ({
    ...row,
    label: monthLabel(row.month),
  }));
  const totalApplications = applicationData.reduce((sum, row) => sum + row.applications, 0);
  const funnelData = (funnel.data?.funnel ?? []).map((row) => ({
    ...row,
    label: humanize(row.stage_type),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Analytics"
        description="Track volume, conversion and speed across your hiring process."
        actions={<PeriodPicker preset={preset} onPresetChange={setPreset} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Applications"
          value={totalApplications}
          icon={<FundOutlined />}
          accent="indigo"
          hint="Across the months shown below"
          loading={applications.isPending}
        />
        <StatCard
          label="Hires"
          value={timeToHire.data?.hires ?? 0}
          icon={<TrophyOutlined />}
          accent="emerald"
          hint="Used for time-to-hire"
          loading={timeToHire.isPending}
        />
        <StatCard
          label="Average time to hire"
          value={timeToHire.data?.average_days ?? '—'}
          suffix={timeToHire.data?.average_days == null ? undefined : 'days'}
          icon={<ClockCircleOutlined />}
          accent="amber"
          hint="From application to accepted offer"
          loading={timeToHire.isPending}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          title="Applications by month"
          extra={
            <ChartLegend
              items={APPLICATION_SERIES.map((s) => ({ label: s.label, color: s.color }))}
            />
          }
        >
          {applications.isPending ? (
            <ChartPlaceholder />
          ) : applicationData.length === 0 ? (
            <EmptyState compact title="No applications in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={applicationData}
                barGap={2}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#EEF0F4" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                {APPLICATION_SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard
          className="xl:col-span-2"
          title="Hiring funnel"
          description="Applications that reached each stage type"
        >
          {funnel.isPending ? (
            <ChartPlaceholder />
          ) : funnelData.length === 0 ? (
            <EmptyState compact title="No funnel data yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#EEF0F4" />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={96}
                    {...axisProps}
                    tick={{ fill: '#475569', fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Bar
                    dataKey="applications"
                    name="Applications"
                    fill={chartColors[0]}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 border-t border-border-soft pt-4">
                <Chips entries={Object.entries(funnel.data?.statuses ?? {})} />
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Time to hire by month"
          description="Average days from application to hire"
        >
          {timeToHire.isPending ? (
            <ChartPlaceholder height={240} />
          ) : timeToHireMonths.every((row) => row.average_days === null) ? (
            <EmptyState compact title="No hires in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={timeToHireMonths}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#EEF0F4" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip
                  content={<ChartTooltip unit=" days" />}
                  cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }}
                />
                <Line
                  type="monotone"
                  dataKey="average_days"
                  name="Average"
                  stroke={chartColors[0]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: chartColors[0] }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Time to hire by department" flush>
          <Table
            size="middle"
            rowKey={(row) => String(row.department_id ?? 'none')}
            loading={timeToHire.isPending}
            pagination={false}
            dataSource={timeToHire.data?.per_department ?? []}
            locale={{ emptyText: <EmptyState compact title="No hires yet" /> }}
            columns={[
              {
                title: 'Department',
                dataIndex: 'name',
                render: (name: string) => <span className="font-medium">{name}</span>,
              },
              { title: 'Hires', dataIndex: 'hires', align: 'right' },
              {
                title: 'Avg. days',
                dataIndex: 'average_days',
                align: 'right',
                render: (value: number | null) => value ?? '—',
              },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Jobs by department"
          description={
            <span className="mt-2 block">
              <Chips entries={Object.entries(jobs.data?.by_status ?? {})} />
            </span>
          }
          flush
        >
          <Table
            size="middle"
            rowKey={(row) => String(row.department_id ?? 'unassigned')}
            loading={jobs.isPending}
            pagination={false}
            dataSource={jobs.data?.by_department ?? []}
            locale={{ emptyText: <EmptyState compact title="No jobs yet" /> }}
            columns={[
              {
                title: 'Department',
                dataIndex: 'name',
                render: (name: string) => <span className="font-medium">{name}</span>,
              },
              { title: 'Jobs', dataIndex: 'jobs', align: 'right' },
              { title: 'Published', dataIndex: 'published_jobs', align: 'right' },
              { title: 'Applications', dataIndex: 'applications', align: 'right' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Recruiter performance" flush>
          <Table
            size="middle"
            rowKey="user_id"
            loading={recruiters.isPending}
            pagination={false}
            dataSource={recruiters.data ?? []}
            locale={{ emptyText: <EmptyState compact title="No recruiter activity yet" /> }}
            columns={[
              {
                title: 'Recruiter',
                dataIndex: 'name',
                render: (name: string) => (
                  <span className="flex items-center gap-2.5 font-medium">
                    <UserAvatar name={name} size="xs" />
                    {name}
                  </span>
                ),
              },
              { title: 'Assigned', dataIndex: 'assigned', align: 'right' },
              { title: 'Interviews', dataIndex: 'interviews_scheduled', align: 'right' },
              { title: 'Offers', dataIndex: 'offers_created', align: 'right' },
              { title: 'Hires', dataIndex: 'hired', align: 'right' },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}
