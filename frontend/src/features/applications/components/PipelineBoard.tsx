import { ClockCircleOutlined, HolderOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tooltip } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { CandidateCard } from '@/components/CandidateCard';
import { UserAvatar } from '@/components/UserAvatar';
import { stageAccent } from './stageColors';
import type { Application, PipelineColumn } from '../types';

dayjs.extend(relativeTime);

interface PipelineBoardProps {
  columns: PipelineColumn[];
  canMove: boolean;
  showJob: boolean;
  onMove: (application: Application, stageId: number) => void;
}

const DRAG_TYPE = 'application/x-hireflow-application';

/**
 * Kanban board of the recruitment pipeline. Cards can be dragged between columns or moved with
 * the card menu (keyboard and screen-reader friendly). The API validates every move.
 */
export function PipelineBoard({ columns, canMove, showJob, onMove }: PipelineBoardProps) {
  const [dragOver, setDragOver] = useState<number | null>(null);
  const movableStages = columns.filter((column) => column.stage.type !== 'hired');

  const onDrop = (event: DragEvent<HTMLDivElement>, stageId: number) => {
    event.preventDefault();
    setDragOver(null);
    const id = Number(event.dataTransfer.getData(DRAG_TYPE));
    const application = columns.flatMap((c) => c.applications).find((a) => a.id === id);
    if (application && application.stage?.id !== stageId) onMove(application, stageId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" role="list" aria-label="Recruitment pipeline">
      {columns.map(({ stage, applications }) => {
        const droppable = canMove && stage.type !== 'hired';
        const accent = stageAccent(stage.type);
        return (
          <div
            key={stage.id}
            role="listitem"
            aria-label={`${stage.name}: ${applications.length} candidates`}
            className={`flex max-h-[calc(100vh-230px)] min-h-[320px] w-[288px] shrink-0 flex-col rounded-2xl border border-border bg-slate-50/80 transition-all ${
              dragOver === stage.id
                ? 'border-indigo-300 bg-indigo-50/60 ring-4 ring-indigo-100'
                : ''
            }`}
            onDragOver={(event) => {
              if (!droppable) return;
              event.preventDefault();
              setDragOver(stage.id);
            }}
            onDragLeave={() => setDragOver((current) => (current === stage.id ? null : current))}
            onDrop={(event) => (droppable ? onDrop(event, stage.id) : undefined)}
          >
            <div className={`h-1 rounded-t-2xl ${accent.bar}`} aria-hidden="true" />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden="true" />
                {stage.name}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums ring-1 ring-border">
                {applications.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pt-1 pb-3">
              {applications.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400">
                  {droppable ? 'Drop candidates here' : 'No candidates'}
                </div>
              ) : (
                applications.map((application) => {
                  const draggable = canMove && application.status === 'active';
                  return (
                    <div
                      key={application.id}
                      draggable={draggable}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_TYPE, String(application.id));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      className={`group rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-card)] transition-all hover:border-indigo-200 hover:shadow-[var(--shadow-lift)] ${
                        draggable ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/applications/${application.id}`}
                          className="min-w-0 flex-1 !text-inherit"
                        >
                          <CandidateCard
                            size="small"
                            name={application.candidate?.full_name ?? 'Candidate'}
                            subtitle={
                              showJob ? application.job?.title : application.candidate?.headline
                            }
                          />
                        </Link>
                        {draggable ? (
                          <Dropdown
                            trigger={['click']}
                            menu={{
                              items: movableStages
                                .filter((c) => c.stage.id !== stage.id)
                                .map((c) => ({
                                  key: String(c.stage.id),
                                  label: `Move to ${c.stage.name}`,
                                })),
                              onClick: ({ key }) => onMove(application, Number(key)),
                            }}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              className="!text-slate-400"
                              aria-label={`Move ${application.candidate?.full_name ?? 'candidate'}`}
                            />
                          </Dropdown>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-2.5 text-xs text-slate-500">
                        {application.assignee ? (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <UserAvatar name={application.assignee.name} size="xs" />
                            <span className="truncate">{application.assignee.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                        {application.stage_entered_at ? (
                          <Tooltip title="Time in this stage">
                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                              <ClockCircleOutlined className="text-[10px]" />
                              {dayjs(application.stage_entered_at).fromNow(true)}
                            </span>
                          </Tooltip>
                        ) : null}
                        {draggable ? (
                          <HolderOutlined
                            aria-hidden="true"
                            className="ml-1 hidden text-slate-300 group-hover:inline"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
