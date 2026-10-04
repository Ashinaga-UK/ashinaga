import { escapeCsvValue } from '../utils/csv';

/** This report's window. Overview and the staff digest stay on NOTIFICATION_INACTIVITY_DAYS (14). */
export const SCHOLAR_ACTIVITY_STALE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ScholarActivityStatus = 'active' | 'inactive' | 'on_hold' | 'archived';
export type ScholarActivityStage = 'prep_year' | 'scholar';
export type ScholarActivitySortBy = 'name' | 'lastActivity' | 'taskCompletionRate';
export type ScholarActivitySortOrder = 'asc' | 'desc';

export const SCHOLAR_ACTIVITY_STATUSES: ScholarActivityStatus[] = [
  'active',
  'inactive',
  'on_hold',
  'archived',
];

export type ScholarActivityFilters = {
  sortBy?: ScholarActivitySortBy;
  sortOrder?: ScholarActivitySortOrder;
};

export type ScholarActivityScholarInput = {
  scholarId: string;
  name: string;
  email: string;
  status: ScholarActivityStatus;
  program: string;
  year: string;
  programStage: ScholarActivityStage;
  nationality: string | null;
  lastActivity: Date | string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  /** Null when the request did not set from or to. */
  tasksCompletedInRange: number | null;
  tasksBehind: number;
  goalsTotal: number;
  goalsCompleted: number;
  /** Null when the request did not set from or to. */
  goalsUpdatedInRange: number | null;
  avgCompletionScale: number | null;
};

export type ScholarActivityFilterOptionsInput = {
  programs: Array<string | null | undefined>;
  years: Array<string | null | undefined>;
  nationalities: Array<string | null | undefined>;
};

export type ScholarActivityRow = {
  scholarId: string;
  name: string;
  email: string;
  status: ScholarActivityStatus;
  program: string;
  year: string;
  programStage: ScholarActivityStage;
  nationality: string | null;
  lastActivity: string | null;
  daysSinceActivity: number | null;
  lastActivityUnknown: boolean;
  isStaleLogin: boolean;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksCompletedInRange: number | null;
  tasksBehind: number;
  taskCompletionRate: number | null;
  goalsTotal: number;
  goalsCompleted: number;
  goalsUpdatedInRange: number | null;
  avgCompletionScale: number | null;
};

export type ScholarActivityPage = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type ScholarActivityCohort = {
  program: string;
  year: string;
  scholarCount: number;
  staleLoginCount: number;
  unknownLoginCount: number;
  scholarsBehindOnTasks: number;
  avgTaskCompletionRate: number | null;
};

export type ScholarActivityReport = {
  summary: {
    scholarCount: number;
    staleLoginCount: number;
    unknownLoginCount: number;
    scholarsBehindOnTasks: number;
    avgTaskCompletionRate: number | null;
  };
  cohorts: ScholarActivityCohort[];
  scholars: ScholarActivityRow[];
  meta: ScholarActivityPage;
  filterOptions: {
    programs: string[];
    years: string[];
    nationalities: string[];
    statuses: ScholarActivityStatus[];
  };
};

export function activityRangeStart(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date-only values include that UTC day. Timestamps stay exclusive at the given instant. */
export function activityRangeEnd(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function completionRate(completed: number, assigned: number): number | null {
  if (assigned === 0) return null;
  return Math.round((completed / assigned) * 100);
}

function roundScale(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function activityFlags(lastActivity: string | null, now: Date) {
  if (!lastActivity) {
    return { daysSinceActivity: null, lastActivityUnknown: true, isStaleLogin: false };
  }
  const elapsed = now.getTime() - new Date(lastActivity).getTime();
  const staleAfter = SCHOLAR_ACTIVITY_STALE_DAYS * DAY_MS;
  return {
    daysSinceActivity: Math.max(0, Math.floor(elapsed / DAY_MS)),
    lastActivityUnknown: false,
    isStaleLogin: elapsed >= staleAfter,
  };
}

function weightedCompletion(
  rows: Array<{ tasksCompleted: number; tasksAssigned: number }>
): number | null {
  let completed = 0;
  let assigned = 0;
  for (const row of rows) {
    completed += row.tasksCompleted;
    assigned += row.tasksAssigned;
  }
  return completionRate(completed, assigned);
}

function compareNullable(
  a: number | null,
  b: number | null,
  order: ScholarActivitySortOrder,
  nulls: 'first' | 'last'
): number {
  if (a == null && b == null) return 0;
  if (a == null) return nulls === 'first' ? -1 : 1;
  if (b == null) return nulls === 'first' ? 1 : -1;
  return order === 'asc' ? a - b : b - a;
}

function sortScholars(
  rows: ScholarActivityRow[],
  sortBy: ScholarActivitySortBy,
  sortOrder: ScholarActivitySortOrder
): ScholarActivityRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'lastActivity') {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : null;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : null;
      diff = compareNullable(aTime, bTime, sortOrder, sortOrder === 'asc' ? 'first' : 'last');
    } else if (sortBy === 'taskCompletionRate') {
      diff = compareNullable(a.taskCompletionRate, b.taskCompletionRate, sortOrder, 'last');
    } else {
      diff = a.name.localeCompare(b.name, 'en-GB');
      if (sortOrder === 'desc') diff = -diff;
    }
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'en-GB');
  });
}

function buildCohorts(rows: ScholarActivityRow[]): ScholarActivityCohort[] {
  const groups = new Map<string, ScholarActivityRow[]>();
  for (const row of rows) {
    const key = `${row.program}\0${row.year}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const cohorts = [...groups.entries()].map(([, group]) => {
    const first = group[0];
    if (!first) {
      throw new Error('Cohort group was empty');
    }
    return {
      program: first.program,
      year: first.year,
      scholarCount: group.length,
      staleLoginCount: group.filter((row) => row.isStaleLogin).length,
      unknownLoginCount: group.filter((row) => row.lastActivityUnknown).length,
      scholarsBehindOnTasks: group.filter((row) => row.tasksBehind > 0).length,
      avgTaskCompletionRate: weightedCompletion(group),
    };
  });

  cohorts.sort((a, b) => {
    const shareA = a.scholarCount === 0 ? 0 : a.staleLoginCount / a.scholarCount;
    const shareB = b.scholarCount === 0 ? 0 : b.staleLoginCount / b.scholarCount;
    if (shareB !== shareA) return shareB - shareA;
    const rateA = a.avgTaskCompletionRate ?? 101;
    const rateB = b.avgTaskCompletionRate ?? 101;
    if (rateA !== rateB) return rateA - rateB;
    const program = a.program.localeCompare(b.program, 'en-GB');
    if (program !== 0) return program;
    return a.year.localeCompare(b.year, 'en-GB');
  });

  return cohorts;
}

function sortedDistinct(values: Array<string | null | undefined>): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase('en-GB');
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base' }));
}

export function buildFilterOptions(sources: ScholarActivityFilterOptionsInput) {
  return {
    programs: sortedDistinct(sources.programs),
    years: sortedDistinct(sources.years),
    nationalities: sortedDistinct(sources.nationalities),
    statuses: SCHOLAR_ACTIVITY_STATUSES,
  };
}

export function paginateScholarActivityReport(
  report: ScholarActivityReport,
  page = 1,
  limit = 50
): ScholarActivityReport {
  const totalItems = report.scholars.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return {
    ...report,
    scholars: report.scholars.slice(start, start + limit),
    meta: { page: safePage, limit, totalItems, totalPages },
  };
}

export function buildScholarActivityReport(
  scholars: ScholarActivityScholarInput[],
  optionSources: ScholarActivityFilterOptionsInput = {
    programs: [],
    years: [],
    nationalities: [],
  },
  filters: ScholarActivityFilters = {},
  now = new Date()
): ScholarActivityReport {
  const rows = scholars.map((scholar) => {
    const lastActivity = toIso(scholar.lastActivity);
    const flags = activityFlags(lastActivity, now);
    return {
      scholarId: scholar.scholarId,
      name: scholar.name,
      email: scholar.email,
      status: scholar.status,
      program: scholar.program,
      year: scholar.year,
      programStage: scholar.programStage,
      nationality: scholar.nationality,
      lastActivity,
      ...flags,
      tasksAssigned: scholar.tasksAssigned,
      tasksCompleted: scholar.tasksCompleted,
      tasksCompletedInRange: scholar.tasksCompletedInRange,
      tasksBehind: scholar.tasksBehind,
      taskCompletionRate: completionRate(scholar.tasksCompleted, scholar.tasksAssigned),
      goalsTotal: scholar.goalsTotal,
      goalsCompleted: scholar.goalsCompleted,
      goalsUpdatedInRange: scholar.goalsUpdatedInRange,
      avgCompletionScale: roundScale(scholar.avgCompletionScale),
    } satisfies ScholarActivityRow;
  });

  const sorted = sortScholars(rows, filters.sortBy ?? 'name', filters.sortOrder ?? 'asc');

  return {
    summary: {
      scholarCount: sorted.length,
      staleLoginCount: sorted.filter((row) => row.isStaleLogin).length,
      unknownLoginCount: sorted.filter((row) => row.lastActivityUnknown).length,
      scholarsBehindOnTasks: sorted.filter((row) => row.tasksBehind > 0).length,
      avgTaskCompletionRate: weightedCompletion(sorted),
    },
    cohorts: buildCohorts(sorted),
    scholars: sorted,
    meta: { page: 1, limit: sorted.length, totalItems: sorted.length, totalPages: 1 },
    filterOptions: buildFilterOptions(optionSources),
  };
}

function activityLabel(row: ScholarActivityRow): string {
  if (row.lastActivityUnknown) return 'Unknown';
  if (row.isStaleLogin) return 'No activity in 30 days';
  return 'Seen recently';
}

export function scholarActivityReportToCsv(report: ScholarActivityReport): string {
  const headers = [
    'Name',
    'Email',
    'Status',
    'Program',
    'Year',
    'Stage',
    'Nationality',
    'Last seen',
    'Activity',
    'Days since activity',
    'Tasks assigned',
    'Tasks completed',
    'Tasks completed in range',
    'Tasks behind',
    'Task completion rate',
    'Goals total',
    'Goals completed',
    'Goals updated in range',
    'Average goal scale',
  ];

  const rows = report.scholars.map((row) => [
    row.name,
    row.email,
    row.status,
    row.program,
    row.year,
    row.programStage,
    row.nationality ?? '',
    row.lastActivity ?? '',
    activityLabel(row),
    row.daysSinceActivity ?? '',
    row.tasksAssigned,
    row.tasksCompleted,
    row.tasksCompletedInRange,
    row.tasksBehind,
    row.taskCompletionRate == null ? '' : `${row.taskCompletionRate}%`,
    row.goalsTotal,
    row.goalsCompleted,
    row.goalsUpdatedInRange,
    row.avgCompletionScale ?? '',
  ]);

  return [headers, ...rows]
    .map((cells) => cells.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');
}
