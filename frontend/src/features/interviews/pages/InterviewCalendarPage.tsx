import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover, Spin } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { usePermission } from '@/hooks/usePermission';
import { InterviewStatusBadge } from '../components/InterviewStatusBadge';
import { InterviewViewSwitch } from '../components/InterviewViewSwitch';
import { useInterviews } from '../queries';
import type { Interview } from '../types';

const CHIP: Record<Interview['status'], string> = {
  scheduled: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-l-indigo-500',
  completed: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-l-emerald-500',
  cancelled: 'bg-slate-100 text-slate-500 line-through hover:bg-slate-200 border-l-slate-300',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PER_DAY = 3;

function InterviewChip({ interview }: { interview: Interview }) {
  const name = interview.application?.candidate.full_name ?? 'Interview';
  return (
    <Popover
      arrow={false}
      title={
        <div className="flex items-center justify-between gap-4">
          <span>{name}</span>
          <InterviewStatusBadge status={interview.status} />
        </div>
      }
      content={
        <div className="min-w-[220px] text-[13px] text-slate-600">
          <div>{interview.application?.job.title}</div>
          <div className="mt-1">
            {interview.type_label} · {dayjs(interview.scheduled_at).format('ddd D MMM, HH:mm')} –{' '}
            {dayjs(interview.ends_at).format('HH:mm')}
          </div>
          <Link to={`/interviews/${interview.id}`} className="mt-2 inline-block font-medium">
            Open interview
          </Link>
        </div>
      }
    >
      <Link
        to={`/interviews/${interview.id}`}
        className={`block truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] font-medium ${CHIP[interview.status]}`}
      >
        <span className="tabular-nums">{dayjs(interview.scheduled_at).format('HH:mm')}</span> {name}
      </Link>
    </Popover>
  );
}

export function InterviewCalendarPage() {
  const isScheduler = usePermission('interviews.schedule');
  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'));

  const gridStart = month.startOf('month').startOf('week');
  const gridEnd = month.endOf('month').endOf('week');
  const range = useMemo(
    () => ({
      from: month.startOf('month').startOf('week').toISOString(),
      to: month.endOf('month').endOf('week').toISOString(),
    }),
    [month],
  );
  const interviews = useInterviews({ ...range, per_page: 200, mine: !isScheduler });

  const byDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const interview of interviews.data?.data ?? []) {
      const key = dayjs(interview.scheduled_at).format('YYYY-MM-DD');
      map.set(key, [...(map.get(key) ?? []), interview]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }
    return map;
  }, [interviews.data]);

  const days: Dayjs[] = [];
  for (let day = gridStart; !day.isAfter(gridEnd, 'day'); day = day.add(1, 'day')) days.push(day);
  const today = dayjs();
  const monthTotal = (interviews.data?.data ?? []).filter((i) =>
    dayjs(i.scheduled_at).isSame(month, 'month'),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Recruiting"
        title="Interview calendar"
        description={
          isScheduler ? 'All interviews in your company.' : 'Interviews you are part of.'
        }
        actions={<InterviewViewSwitch value="calendar" />}
      />
      <div className="hf-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-lg font-semibold text-slate-900">
              {month.format('MMMM YYYY')}
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {monthTotal} interview{monthTotal === 1 ? '' : 's'}
            </span>
            {interviews.isFetching ? <Spin size="small" /> : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Previous month"
              icon={<LeftOutlined />}
              onClick={() => setMonth((m) => m.subtract(1, 'month'))}
            />
            <Button onClick={() => setMonth(dayjs().startOf('month'))}>Today</Button>
            <Button
              aria-label="Next month"
              icon={<RightOutlined />}
              onClick={() => setMonth((m) => m.add(1, 'month'))}
            />
          </div>
        </div>

        {interviews.isError ? (
          <ErrorState error={interviews.error} onRetry={() => void interviews.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="border-b border-border-soft bg-slate-50/70 px-3 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase"
                >
                  {weekday}
                </div>
              ))}
              {days.map((day) => {
                const items = byDay.get(day.format('YYYY-MM-DD')) ?? [];
                const inMonth = day.isSame(month, 'month');
                const isToday = day.isSame(today, 'day');
                return (
                  <div
                    key={day.format('YYYY-MM-DD')}
                    className={`min-h-[118px] border-r border-b border-border-soft p-2 [&:nth-child(7n)]:border-r-0 ${
                      inMonth ? 'bg-white' : 'bg-slate-50/60'
                    }`}
                  >
                    <div className="mb-1.5 flex justify-end">
                      <span
                        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                          isToday
                            ? 'bg-primary text-white'
                            : inMonth
                              ? 'text-slate-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {day.date()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {items.slice(0, MAX_PER_DAY).map((interview) => (
                        <InterviewChip key={interview.id} interview={interview} />
                      ))}
                      {items.length > MAX_PER_DAY ? (
                        <Popover
                          arrow={false}
                          title={day.format('dddd, MMM D')}
                          content={
                            <div className="flex w-56 flex-col gap-1">
                              {items.map((interview) => (
                                <InterviewChip key={interview.id} interview={interview} />
                              ))}
                            </div>
                          }
                        >
                          <button
                            type="button"
                            className="cursor-pointer border-0 bg-transparent px-1.5 text-left text-[11px] font-semibold text-slate-500 hover:text-primary"
                          >
                            +{items.length - MAX_PER_DAY} more
                          </button>
                        </Popover>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
