import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from './queries';
import type { AppNotification } from './types';

dayjs.extend(relativeTime);

/** Header bell with the latest in-app notifications. */
export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications(false);
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const unread =
    (data as { meta?: { unread_count?: number } } | undefined)?.meta?.unread_count ?? 0;
  const items = data?.data ?? [];

  const openItem = (item: AppNotification) => {
    if (!item.read_at) markOne.mutate(item.id);
    // Only follow in-app paths; never navigate to an absolute URL from notification data.
    if (item.link && item.link.startsWith('/') && !item.link.startsWith('//')) {
      setOpen(false);
      void navigate(item.link);
    }
  };

  const content = (
    <div className="-mx-3 -my-2 w-[360px]">
      <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">Notifications</span>
          {unread > 0 ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {unread} new
            </span>
          ) : null}
        </div>
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          onClick={() => markAll.mutate()}
          disabled={unread === 0}
        >
          Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<BellOutlined />}
          title="You're all caught up"
          description="New activity on your jobs and candidates shows up here."
        />
      ) : (
        <ul className="m-0 max-h-[420px] list-none overflow-y-auto p-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className={`flex w-full cursor-pointer gap-3 rounded-lg border-0 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${item.read_at ? 'bg-transparent' : 'bg-indigo-50/40'}`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-transparent' : 'bg-primary'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">
                    {item.message}
                  </span>
                  {item.created_at ? (
                    <span className="mt-1 block text-xs text-slate-400">
                      {dayjs(item.created_at).fromNow()}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      arrow={false}
    >
      <Badge count={unread} size="small" offset={[-4, 4]} overflowCount={9}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined className="text-[17px]" />}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className="!text-slate-500"
        />
      </Badge>
    </Popover>
  );
}
