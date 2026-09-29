import { isStaleLastActivity } from '../notifications/notification-windows';
import { isTaskDueToday, isTaskOverdue } from '../tasks/task-due';

export const OVERVIEW_ATTENTION_CAP = 50;

export type OverviewAttentionType =
  | 'overdue_task'
  | 'due_today'
  | 'pending_request'
  | 'stale_scholar'
  | 'missing_document'
  | 'incomplete_platform'
  | 'annual_review_draft';

export type OverviewAttentionItem = {
  id: string;
  type: OverviewAttentionType;
  title: string;
  scholarName: string;
  scholarId: string;
  href: string;
  meta: {
    dueDate?: string;
    daysOverdue?: number;
    submittedDate?: string;
    lastActivity?: string;
    daysInactive?: number;
    academicYear?: string;
    missingCount?: number;
  };
};

export type OverviewPrepGapKind = 'documents' | 'platforms' | 'pathway' | 'overdue_task';

export type OverviewPrepGap = {
  id: string;
  kind: OverviewPrepGapKind;
  title: string;
  scholarName: string;
  scholarId: string;
  href: string;
};

export type OverviewPrepSnapshot = {
  candidateCount: number;
  gaps: OverviewPrepGap[];
  total: number;
  truncated: boolean;
};

export type OverviewAttentionCounts = {
  action: number;
  follow: number;
  prep: number;
  reviews: number;
};

export type OverviewPayload = {
  cohort: {
    total: number;
    active: number;
    prepYear: number;
  };
  attention: {
    items: OverviewAttentionItem[];
    total: number;
    truncated: boolean;
    counts: OverviewAttentionCounts;
  };
  prepYear: OverviewPrepSnapshot | null;
};

type ScholarStatus = 'active' | 'inactive' | 'on_hold' | 'archived';

export type OverviewPrepScholar = {
  scholarId: string;
  name: string;
  status: ScholarStatus;
  intendedUniversity: string | null;
  intendedCourse: string | null;
  degreePathway: string | null;
  overdueCount: number;
  missingDocumentCount: number;
  incompletePlatformCount: number;
  missingDocuments: string[];
  incompletePlatforms: string[];
};

export type OverviewTaskRow = {
  id: string;
  title: string;
  dueDate: Date | string;
  status: string;
  scholarId: string;
  scholarName: string;
};

export type OverviewRequestRow = {
  id: string;
  type: string;
  submittedDate: Date | string;
  scholarId: string;
  scholarName: string;
};

export type OverviewScholarRow = {
  id: string;
  name: string;
  lastActivity: Date | string | null | undefined;
};

export type OverviewDraftRow = {
  id: string;
  scholarId: string;
  scholarName: string;
  academicYear: string;
};

export type OverviewBuildInput = {
  now?: Date;
  scholarStats: { total: number; active: number };
  prepYearCount: number;
  prepScholars: OverviewPrepScholar[];
  tasks: OverviewTaskRow[];
  requests: OverviewRequestRow[];
  scholars: OverviewScholarRow[];
  drafts: OverviewDraftRow[];
};

const REQUEST_LABELS: Record<string, string> = {
  extenuating_circumstances: 'Extenuating Circumstances',
  summer_funding_request: 'Summer Funding Request',
  summer_funding_report: 'Summer Funding Report',
  requirement_submission: 'Requirement Submission',
  others: 'Others',
};

function scholarHref(scholarId: string, scholarTab?: string): string {
  const params = new URLSearchParams({
    tab: 'scholars',
    view: 'scholar-profile',
    scholarId,
  });
  if (scholarTab) params.set('scholarTab', scholarTab);
  return `/?${params.toString()}`;
}

function requestHref(requestId: string): string {
  const params = new URLSearchParams({
    tab: 'requests',
    status: 'pending',
    requestId,
  });
  return `/?${params.toString()}`;
}

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function elapsedDays(then: Date | string, now: Date): number {
  return Math.floor((now.getTime() - new Date(then).getTime()) / 86_400_000);
}

function overdueDays(dueDate: Date | string, now: Date): number {
  const due = new Date(dueDate);
  const startDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const startNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.round((startNow - startDue) / 86_400_000));
}

function filled(value: string | null): boolean {
  return Boolean(value?.trim());
}

function byName(a: { scholarName: string }, b: { scholarName: string }): number {
  return a.scholarName.localeCompare(b.scholarName, 'en-GB');
}

function requestLabel(type: string): string {
  return REQUEST_LABELS[type] ?? type;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  if (labels.length === 3) return `${labels[0]}, ${labels[1]}, and ${labels[2]}`;
  return `${labels[0]}, ${labels[1]}, and ${labels.length - 2} more`;
}

export function buildOverview(input: OverviewBuildInput): OverviewPayload {
  const now = input.now ?? new Date();
  const activePrep = input.prepScholars.filter((scholar) => scholar.status === 'active');

  const overdue = input.tasks
    .filter((task) => isTaskOverdue(task, now))
    .map((task) => ({
      id: `overdue_task:${task.id}`,
      type: 'overdue_task' as const,
      title: task.title,
      scholarName: task.scholarName,
      scholarId: task.scholarId,
      href: scholarHref(task.scholarId, 'tasks'),
      meta: { dueDate: toIso(task.dueDate), daysOverdue: overdueDays(task.dueDate, now) },
    }))
    .sort((a, b) => (b.meta.daysOverdue ?? 0) - (a.meta.daysOverdue ?? 0) || byName(a, b));

  const dueToday = input.tasks
    .filter((task) => isTaskDueToday(task, now))
    .map((task) => ({
      id: `due_today:${task.id}`,
      type: 'due_today' as const,
      title: task.title,
      scholarName: task.scholarName,
      scholarId: task.scholarId,
      href: scholarHref(task.scholarId, 'tasks'),
      meta: { dueDate: toIso(task.dueDate) },
    }))
    .sort(byName);

  const requests = [...input.requests]
    .sort((a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime())
    .map((request) => ({
      id: `pending_request:${request.id}`,
      type: 'pending_request' as const,
      title: requestLabel(request.type),
      scholarName: request.scholarName,
      scholarId: request.scholarId,
      href: requestHref(request.id),
      meta: { submittedDate: toIso(request.submittedDate) },
    }));

  const stale = input.scholars
    .filter((scholar) => isStaleLastActivity(scholar.lastActivity, now))
    .map((scholar) => ({
      id: `stale_scholar:${scholar.id}`,
      type: 'stale_scholar' as const,
      title: `No activity for ${elapsedDays(scholar.lastActivity as Date | string, now)} days`,
      scholarName: scholar.name,
      scholarId: scholar.id,
      href: scholarHref(scholar.id),
      meta: {
        lastActivity: toIso(scholar.lastActivity as Date | string),
        daysInactive: elapsedDays(scholar.lastActivity as Date | string, now),
      },
    }))
    .sort((a, b) => (b.meta.daysInactive ?? 0) - (a.meta.daysInactive ?? 0) || byName(a, b));

  const documents = activePrep
    .filter((scholar) => scholar.missingDocumentCount > 0)
    .map((scholar) => ({
      id: `missing_document:${scholar.scholarId}`,
      type: 'missing_document' as const,
      title:
        scholar.missingDocuments.length > 0
          ? `${joinLabels(scholar.missingDocuments)} missing`
          : scholar.missingDocumentCount === 1
            ? '1 document missing'
            : `${scholar.missingDocumentCount} documents missing`,
      scholarName: scholar.name,
      scholarId: scholar.scholarId,
      href: scholarHref(scholar.scholarId, 'documents'),
      meta: { missingCount: scholar.missingDocumentCount },
    }))
    .sort(byName);

  const platforms = activePrep
    .filter((scholar) => scholar.incompletePlatformCount > 0)
    .map((scholar) => ({
      id: `incomplete_platform:${scholar.scholarId}`,
      type: 'incomplete_platform' as const,
      title:
        scholar.incompletePlatforms.length > 0
          ? `${joinLabels(scholar.incompletePlatforms)} still pending`
          : 'Platform setup incomplete',
      scholarName: scholar.name,
      scholarId: scholar.scholarId,
      href: scholarHref(scholar.scholarId),
      meta: { missingCount: scholar.incompletePlatformCount },
    }))
    .sort(byName);

  const drafts = [...input.drafts].sort(byName).map((draft) => ({
    id: `annual_review_draft:${draft.id}`,
    type: 'annual_review_draft' as const,
    title: 'Annual review draft',
    scholarName: draft.scholarName,
    scholarId: draft.scholarId,
    href: scholarHref(draft.scholarId, 'annual-reviews'),
    meta: { academicYear: draft.academicYear },
  }));

  const groups = {
    action: [...overdue, ...dueToday, ...requests],
    follow: stale,
    prep: [...documents, ...platforms],
    reviews: drafts,
  };
  const counts: OverviewAttentionCounts = {
    action: groups.action.length,
    follow: groups.follow.length,
    prep: groups.prep.length,
    reviews: groups.reviews.length,
  };
  const ranked = [...groups.action, ...groups.follow, ...groups.prep, ...groups.reviews];
  const items = (Object.values(groups) as OverviewAttentionItem[][]).flatMap((rows) =>
    rows.slice(0, OVERVIEW_ATTENTION_CAP)
  );

  const prepIds = new Set(activePrep.map((scholar) => scholar.scholarId));
  const prepOverdueTasks = input.tasks
    .filter((task) => prepIds.has(task.scholarId) && isTaskOverdue(task, now))
    .sort((a, b) => overdueDays(b.dueDate, now) - overdueDays(a.dueDate, now) || byName(a, b));
  const scholarsWithNamedOverdue = new Set(prepOverdueTasks.map((task) => task.scholarId));

  const prepGaps: OverviewPrepGap[] = activePrep.flatMap((scholar) => {
    const rows: OverviewPrepGap[] = [];
    if (scholar.missingDocumentCount > 0) {
      rows.push({
        id: `documents:${scholar.scholarId}`,
        kind: 'documents',
        title:
          scholar.missingDocuments.length > 0
            ? `${joinLabels(scholar.missingDocuments)} missing`
            : scholar.missingDocumentCount === 1
              ? '1 document missing'
              : `${scholar.missingDocumentCount} documents missing`,
        scholarName: scholar.name,
        scholarId: scholar.scholarId,
        href: scholarHref(scholar.scholarId, 'documents'),
      });
    }
    if (scholar.incompletePlatformCount > 0) {
      rows.push({
        id: `platforms:${scholar.scholarId}`,
        kind: 'platforms',
        title:
          scholar.incompletePlatforms.length > 0
            ? `${joinLabels(scholar.incompletePlatforms)} still pending`
            : 'Platform setup incomplete',
        scholarName: scholar.name,
        scholarId: scholar.scholarId,
        href: scholarHref(scholar.scholarId),
      });
    }
    const pathway = [
      filled(scholar.intendedUniversity) ? null : 'Intended university',
      filled(scholar.intendedCourse) ? null : 'Intended course',
      filled(scholar.degreePathway) ? null : 'Degree pathway',
    ].filter((field): field is string => Boolean(field));
    if (pathway.length > 0) {
      rows.push({
        id: `pathway:${scholar.scholarId}`,
        kind: 'pathway',
        title: `${joinLabels(pathway)} empty`,
        scholarName: scholar.name,
        scholarId: scholar.scholarId,
        href: scholarHref(scholar.scholarId),
      });
    }
    if (scholar.overdueCount > 0 && !scholarsWithNamedOverdue.has(scholar.scholarId)) {
      rows.push({
        id: `overdue_task:${scholar.scholarId}`,
        kind: 'overdue_task',
        title:
          scholar.overdueCount === 1 ? '1 overdue task' : `${scholar.overdueCount} overdue tasks`,
        scholarName: scholar.name,
        scholarId: scholar.scholarId,
        href: scholarHref(scholar.scholarId, 'tasks'),
      });
    }
    return rows;
  });
  for (const task of prepOverdueTasks) {
    prepGaps.push({
      id: `overdue_task:${task.id}`,
      kind: 'overdue_task',
      title: task.title,
      scholarName: task.scholarName,
      scholarId: task.scholarId,
      href: scholarHref(task.scholarId, 'tasks'),
    });
  }

  const prepYear =
    activePrep.length === 0
      ? null
      : {
          candidateCount: activePrep.length,
          gaps: prepGaps.slice(0, OVERVIEW_ATTENTION_CAP),
          total: prepGaps.length,
          truncated: prepGaps.length > OVERVIEW_ATTENTION_CAP,
        };

  return {
    cohort: {
      total: input.scholarStats.total,
      active: input.scholarStats.active,
      prepYear: input.prepYearCount,
    },
    attention: {
      items,
      total: ranked.length,
      truncated: Object.values(counts).some((count) => count > OVERVIEW_ATTENTION_CAP),
      counts,
    },
    prepYear,
  };
}
