'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  Library,
  MessageSquare,
  Monitor,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import type {
  OverviewAttentionItem,
  OverviewAttentionType,
  OverviewPayload,
} from '../lib/api-client';
import { queryKeys, useOverview } from '../lib/hooks/use-queries';
import { cn } from '../lib/utils';
import { ProposalInbox } from './proposal-inbox';
import { StaffInviteDialog } from './staff-invite-dialog';
import { TaskAssignment } from './task-assignment';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

const VIEWS = [
  {
    id: 'action',
    label: 'Needs you',
    types: ['overdue_task', 'due_today', 'pending_request'] as OverviewAttentionType[],
    purpose:
      'Deadlines that have passed, work due today, and pending requests in your queue. This is the list to clear first.',
    empty: 'Nothing needs you right now.',
  },
  {
    id: 'follow',
    label: 'Follow up',
    types: ['stale_scholar'] as OverviewAttentionType[],
    purpose:
      'Scholars quiet past the inactivity window. A missing login date is unknown, so it is not listed here.',
    empty: 'No scholars are past the inactivity window.',
  },
  {
    id: 'prep',
    label: 'Prep Year',
    types: ['missing_document', 'incomplete_platform'] as OverviewAttentionType[],
    purpose: 'One row per candidate who is missing documents or still setting up platforms.',
    empty: 'No Prep Year gaps.',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    types: ['annual_review_draft'] as OverviewAttentionType[],
    purpose:
      'Draft annual reviews only. A missing review for the current year is not listed until that year is defined.',
    empty: 'No draft annual reviews.',
  },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

const ICONS: Record<OverviewAttentionType, typeof Clock> = {
  overdue_task: Clock,
  due_today: Calendar,
  pending_request: FileText,
  stale_scholar: Clock,
  missing_document: FolderOpen,
  incomplete_platform: Monitor,
  annual_review_draft: ClipboardCheck,
};

const KIND_TONE: Partial<Record<OverviewAttentionType, string>> = {
  overdue_task: 'text-destructive',
  due_today: 'text-[hsl(32_85%_32%)] dark:text-warning',
  pending_request: 'text-[hsl(201_80%_32%)] dark:text-info',
};

const KIND_LABEL: Record<OverviewAttentionType, string> = {
  overdue_task: 'Overdue',
  due_today: 'Due today',
  pending_request: 'Request',
  stale_scholar: 'Inactive',
  missing_document: 'Documents',
  incomplete_platform: 'Platforms',
  annual_review_draft: 'Draft',
};

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormat.format(date);
}

function isViewId(value: string | null): value is ViewId {
  return VIEWS.some((view) => view.id === value);
}

function rowDetail(item: OverviewAttentionItem): string {
  const name = item.scholarName;
  if (item.type === 'overdue_task') {
    const days = item.meta.daysOverdue ?? 0;
    return `${name} · Due ${formatDate(item.meta.dueDate)} · ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (item.type === 'due_today') return `${name} · Due ${formatDate(item.meta.dueDate)}`;
  if (item.type === 'pending_request') {
    return `${name} · Submitted ${formatDate(item.meta.submittedDate)}`;
  }
  if (item.type === 'stale_scholar')
    return `${name} · Last activity ${formatDate(item.meta.lastActivity)}`;
  if (item.type === 'incomplete_platform') {
    const count = item.meta.missingCount ?? 0;
    return `${name} · ${count} ${count === 1 ? 'platform' : 'platforms'} still pending`;
  }
  if (item.type === 'annual_review_draft') return `${name} · ${item.meta.academicYear ?? ''}`;
  return name;
}

const quickActionClassName =
  'group flex min-w-0 w-full flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-left text-sm hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function QuickAction({
  icon,
  label,
  description,
  href,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className={quickActionClassName}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

export function OverviewDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const requested = searchParams.get('attention');
  const view = isViewId(requested) ? requested : 'action';
  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];
  const { data, isLoading, isError, error, refetch, isFetching } = useOverview(true);

  const selectView = (next: ViewId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'overview');
    params.set('attention', next);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card" aria-labelledby="attention-purpose">
        <div className="px-4 pt-4 sm:px-5">
          <p id="attention-purpose" className="max-w-3xl text-sm text-muted-foreground">
            {current.id === 'follow' && data?.followUpDays
              ? `Scholars quiet for ${data.followUpDays} ${data.followUpDays === 1 ? 'day' : 'days'} or more. A missing login date is unknown, so it is not listed here.`
              : current.purpose}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-3 sm:px-5"
          role="tablist"
          aria-label="Attention views"
        >
          {VIEWS.map((item) => {
            const count = data?.attention.counts[item.id] ?? 0;
            const selected = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  'border-b border-transparent pb-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  selected && 'border-brand font-medium text-foreground'
                )}
                onClick={() => selectView(item.id)}
              >
                <span className={cn(selected && 'text-brand')}>{item.label}</span>{' '}
                <span className="tabular-nums text-foreground">{isLoading ? '…' : count}</span>
              </button>
            );
          })}
        </div>
        <AttentionBody
          data={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isFetching={isFetching}
          viewId={current.id}
          viewTypes={current.types}
          empty={current.empty}
          onRetry={() => void refetch()}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" aria-label="Cohort">
        <CohortLink
          label="Scholars"
          value={isError ? undefined : data?.cohort.total}
          loading={isLoading}
          hint={
            isLoading || isError ? undefined : data?.cohort.total === 1 ? 'scholar' : 'scholars'
          }
          href="/?tab=scholars&programStage=scholar"
        />
        <CohortLink
          label="Prep Year"
          value={isError ? undefined : data?.cohort.prepYear}
          loading={isLoading}
          hint={
            isLoading || isError
              ? undefined
              : data?.cohort.prepYear === 1
                ? 'candidate'
                : 'candidates'
          }
          href="/?tab=scholars&programStage=prep_year"
        />
      </section>

      {data?.prepYear ? <PrepYearSnapshot snapshot={data.prepYear} /> : null}

      <section className="rounded-lg border bg-card">
        <div className="px-4 pt-4 sm:px-5">
          <h3 className="text-sm font-semibold leading-none tracking-tight">Quick actions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Common tasks to keep scholars moving forward.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          <QuickAction
            href="/?view=onboarding"
            icon={<Users className="h-4 w-4" aria-hidden />}
            label="Onboard Scholar"
            description="Create a new scholar profile and invitation."
          />
          <TaskAssignment
            trigger={
              <button type="button" className={quickActionClassName}>
                <span className="text-muted-foreground">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">Assign Task</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Send a task to one or more scholars or Prep Year candidates.
                  </span>
                </span>
              </button>
            }
            onSuccess={(scholarIds) => {
              void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
              if (scholarIds.length === 1 && scholarIds[0]) {
                router.push(
                  `?tab=scholars&view=scholar-profile&scholarId=${scholarIds[0]}&scholarTab=tasks`
                );
                return;
              }
              router.push('?tab=scholars');
            }}
          />
          <QuickAction
            href="/?tab=announcements"
            icon={<MessageSquare className="h-4 w-4" aria-hidden />}
            label="Create Announcement"
            description="Publish an update for filtered scholars."
          />
          <QuickAction
            href="/?tab=requests"
            icon={<FileText className="h-4 w-4" aria-hidden />}
            label="Review Requests"
            description="Triage funding and requirement submissions."
          />
          <QuickAction
            href="/?tab=resources"
            icon={<Library className="h-4 w-4" aria-hidden />}
            label="View Resources"
            description="Check scholar-facing handbooks and guides."
          />
          <StaffInviteDialog
            trigger={
              <button type="button" className={quickActionClassName}>
                <span className="text-muted-foreground">
                  <UserPlus className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">Invite Staff</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Add another staff member to the portal.
                  </span>
                </span>
              </button>
            }
          />
        </div>
      </section>

      <ProposalInbox
        onOpenScholar={(scholarId) =>
          router.push(
            `?tab=scholars&view=scholar-profile&scholarId=${scholarId}&scholarTab=proposal`
          )
        }
      />
    </div>
  );
}

function AttentionBody({
  data,
  isLoading,
  isError,
  error,
  isFetching,
  viewId,
  viewTypes,
  empty,
  onRetry,
}: {
  data: OverviewPayload | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  viewId: ViewId;
  viewTypes: readonly OverviewAttentionType[];
  empty: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-4 sm:px-5" aria-live="polite">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-8 text-center sm:px-5" aria-live="polite">
        <p className="text-sm font-medium text-foreground">Couldn’t load what needs attention</p>
        <p className="mt-1 text-sm text-muted-foreground">{error?.message || 'Try again.'}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>
          {isFetching ? 'Loading…' : 'Try again'}
        </Button>
      </div>
    );
  }

  const rows = data.attention.items.filter((item) => viewTypes.includes(item.type));
  const viewTotal = data.attention.counts[viewId];

  return (
    <div>
      {viewTotal > rows.length ? (
        <p className="px-4 pt-3 text-xs tabular-nums text-muted-foreground sm:px-5">
          Showing {rows.length} of {viewTotal}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground sm:px-5">{empty}</p>
      ) : (
        <ol className="mt-3 border-t">
          {rows.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="grid grid-cols-1 gap-1 border-b px-4 py-3.5 text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 text-xs font-medium',
                      KIND_TONE[item.type] ?? 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {KIND_LABEL[item.type]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{item.title}</span>
                    <span className="block truncate text-xs tabular-nums text-muted-foreground">
                      {rowDetail(item)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function CohortLink({
  label,
  value,
  loading,
  hint,
  href,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  hint?: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-card p-4 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-5"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-9 w-20" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {value ?? '—'}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs tabular-nums text-muted-foreground">{hint}</p> : null}
    </Link>
  );
}

const PREP_GAP_LABEL = {
  documents: 'Documents',
  platforms: 'Platforms',
  pathway: 'Pathway',
  overdue_task: 'Overdue',
} as const;

type PrepGap = NonNullable<OverviewPayload['prepYear']>['gaps'][number];

function groupPrepGaps(gaps: PrepGap[]) {
  const groups: { scholarId: string; scholarName: string; gaps: PrepGap[] }[] = [];
  const index = new Map<string, number>();
  for (const gap of gaps) {
    const existing = index.get(gap.scholarId);
    if (existing === undefined) {
      index.set(gap.scholarId, groups.length);
      groups.push({ scholarId: gap.scholarId, scholarName: gap.scholarName, gaps: [gap] });
    } else {
      groups[existing]?.gaps.push(gap);
    }
  }
  return groups;
}

function PrepYearSnapshot({ snapshot }: { snapshot: NonNullable<OverviewPayload['prepYear']> }) {
  const groups = groupPrepGaps(snapshot.gaps);
  return (
    <section className="rounded-lg border bg-card" aria-labelledby="prep-snapshot-heading">
      <div className="flex items-baseline justify-between gap-4 px-4 pt-4 sm:px-5">
        <h3
          id="prep-snapshot-heading"
          className="text-sm font-semibold tracking-tight text-balance"
        >
          Prep Year gaps
        </h3>
        <Link
          href="/?tab=prep-reports"
          className="text-sm underline-offset-4 hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          View full report
        </Link>
      </div>
      <p className="mt-1 max-w-3xl px-4 text-sm text-pretty text-muted-foreground sm:px-5">
        Grouped by candidate. Open a line to fix that gap.
      </p>
      {groups.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground sm:px-5">No Prep Year gaps.</p>
      ) : (
        <>
          {snapshot.truncated ? (
            <p className="px-4 pt-3 text-xs tabular-nums text-muted-foreground sm:px-5">
              Showing {snapshot.gaps.length} of {snapshot.total}
            </p>
          ) : null}
          <ol className="mt-3 border-t">
            {groups.map((group) => (
              <li key={group.scholarId} className="border-b last:border-b-0">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-4 sm:px-5">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">
                    {group.scholarName}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {group.gaps.length === 1 ? '1 gap' : `${group.gaps.length} gaps`}
                  </p>
                </div>
                <ul className="pb-2">
                  {group.gaps.map((gap) => (
                    <li key={gap.id}>
                      <Link
                        href={gap.href}
                        className="grid grid-cols-1 gap-0.5 px-4 py-2 text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4 sm:px-5"
                      >
                        <span className="text-xs text-muted-foreground">
                          {PREP_GAP_LABEL[gap.kind]}
                        </span>
                        <span className="min-w-0 truncate text-foreground">{gap.title}</span>
                        <span className="text-xs text-muted-foreground">Open</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
