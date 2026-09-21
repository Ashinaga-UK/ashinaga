'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  FileText,
  ListChecks,
  Loader2,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useState } from 'react';
import type { StaffNotification, StaffNotificationKind } from '../lib/api-client';
import { useMarkStaffNotificationsRead, useStaffNotificationsFeed } from '../lib/hooks/use-queries';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { useSidebar } from './ui/sidebar';

function notificationIcon(kind: StaffNotificationKind) {
  switch (kind) {
    case 'task_completed':
      return ListChecks;
    case 'annual_review_submitted':
      return ClipboardCheck;
    default:
      return FileText;
  }
}

function relativeTime(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function NotificationsPanel({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useStaffNotificationsFeed(deferredSearch);
  const markRead = useMarkStaffNotificationsRead();

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;

  const handleItemClick = async (notification: StaffNotification) => {
    onNavigate();
    if (!notification.readAt) {
      markRead.mutate({ ids: [notification.id] });
    }
    router.push(notification.href);
  };

  return (
    <div className="flex h-full max-h-[min(32rem,70vh)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          disabled={unreadCount === 0 || markRead.isPending}
          onClick={() => markRead.mutate({ all: true })}
        >
          <CheckCheck className="size-3.5" aria-hidden />
          Mark all read
        </Button>
      </div>

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name"
            className="h-8 pl-8 text-sm"
            aria-label="Search notifications by student name"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {deferredSearch ? 'No matching notifications' : 'No notifications yet'}
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {items.map((notification) => {
                const Icon = notificationIcon(notification.kind);
                const unread = !notification.readAt;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/60',
                        unread && 'bg-accent/30'
                      )}
                      onClick={() => void handleItemClick(notification)}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                          unread
                            ? 'border-brand/40 bg-brand/10 text-brand'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>
                            {notification.title}
                          </span>
                          {unread ? (
                            <span
                              className="mt-1 size-2 shrink-0 rounded-full bg-brand"
                              title="Unread"
                            />
                          ) : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {relativeTime(notification.createdAt)}
                          {isFetching && !isFetchingNextPage && deferredSearch ? ' · updating' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasNextPage ? (
              <div className="border-t px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-xs"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Loading…
                    </>
                  ) : (
                    'Load older notifications'
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function BellButton({ unreadCount, className }: { unreadCount: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <Bell className="size-4" aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </span>
  );
}

export function StaffNotificationsBell() {
  const { isMobile } = useSidebar();
  const { data } = useStaffNotificationsFeed();
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-8"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      <BellButton unreadCount={unreadCount} />
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <NotificationsPanel onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[24rem] p-0">
        <NotificationsPanel onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
