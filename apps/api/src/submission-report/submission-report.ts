import type { RequestType } from '../requests/request-types';
import { escapeCsvValue } from '../utils/csv';

export const SUBMISSION_KINDS = ['request', 'goal_update', 'task_submission'] as const;
export const SUBMISSION_STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
export const SUBMISSION_REPORT_PAGE_SIZE = 25;

export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
export type SubmissionStatusFilter = (typeof SUBMISSION_STATUS_FILTERS)[number];
export type RequestSubmissionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'reviewed'
  | 'commented';
export type GoalSubmissionStatus = 'pending' | 'in_progress' | 'completed';
export type TaskSubmissionStatus = 'pending' | 'in_progress' | 'completed';

export type SubmissionReportQuery = {
  program?: string;
  year?: string;
  kind?: SubmissionKind;
  requestType?: RequestType;
  status?: SubmissionStatusFilter;
  from?: string;
  to?: string;
  scholarId?: string;
  page?: number;
  limit?: number;
};

type ScholarFields = {
  scholarId: string;
  scholarName: string;
  scholarEmail: string;
  program: string;
  year: string;
};

export type RequestSubmissionInput = ScholarFields & {
  id: string;
  requestType: RequestType;
  status: RequestSubmissionStatus;
  submittedAt: Date | string;
  archived: boolean;
  description: string;
};

export type GoalSubmissionInput = ScholarFields & {
  id: string;
  status: GoalSubmissionStatus;
  title: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type TaskSubmissionInput = ScholarFields & {
  id: string;
  taskId: string;
  taskStatus: TaskSubmissionStatus;
  taskType: string;
  taskTitle: string;
  deletedAt: Date | string | null;
  submittedAt: Date | string;
};

export type SubmissionReportInput = {
  requests: RequestSubmissionInput[];
  goals: GoalSubmissionInput[];
  taskResponses: TaskSubmissionInput[];
};

export type SubmissionHistoryRow = ScholarFields & {
  id: string;
  kind: SubmissionKind;
  requestType: RequestType | null;
  taskType: string | null;
  status: string;
  occurredAt: string;
  title: string;
};

export type SubmissionMonthBucket = {
  month: string;
  request: number;
  goal_update: number;
  task_submission: number;
};

export type SubmissionReportPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type SubmissionReport = {
  summary: {
    total: number;
    byKind: Record<SubmissionKind, number>;
  };
  series: SubmissionMonthBucket[];
  rows: SubmissionHistoryRow[];
  pagination: SubmissionReportPagination;
  filterOptions: {
    programs: string[];
    years: string[];
  };
};

type DatedRow = {
  row: SubmissionHistoryRow;
  occurredAt: Date;
};

export function submissionRangeStart(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date-only values include that UTC day. Timestamps stay exclusive at the given instant. */
export function submissionRangeEnd(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyKindCounts(): Record<SubmissionKind, number> {
  return { request: 0, goal_update: 0, task_submission: 0 };
}

function isGoalUpdate(goal: GoalSubmissionInput): boolean {
  const createdAt = toDate(goal.createdAt);
  const updatedAt = toDate(goal.updatedAt);
  if (!createdAt || !updatedAt) return false;
  return updatedAt.getTime() > createdAt.getTime();
}

function matchesStatus(row: SubmissionHistoryRow, status?: SubmissionStatusFilter): boolean {
  if (!status || status === 'all') return true;
  if (status === 'approved') return row.kind === 'request' && row.status === 'approved';
  if (status === 'rejected') return row.kind === 'request' && row.status === 'rejected';
  if (row.kind === 'request') return row.status === 'pending';
  if (row.kind === 'goal_update') return row.status === 'pending' || row.status === 'in_progress';
  return row.status !== 'completed';
}

function matchesQuery(entry: DatedRow, query: SubmissionReportQuery): boolean {
  const { row, occurredAt } = entry;
  if (query.scholarId && row.scholarId !== query.scholarId) return false;
  if (query.program && row.program !== query.program) return false;
  if (query.year && row.year !== query.year) return false;
  if (query.kind && row.kind !== query.kind) return false;
  if (query.requestType && (row.kind !== 'request' || row.requestType !== query.requestType)) {
    return false;
  }
  if (!matchesStatus(row, query.status)) return false;
  const start = submissionRangeStart(query.from);
  const end = submissionRangeEnd(query.to);
  if (start && occurredAt.getTime() < start.getTime()) return false;
  if (end && occurredAt.getTime() >= end.getTime()) return false;
  return true;
}

function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function collectRows(input: SubmissionReportInput): DatedRow[] {
  const rows: DatedRow[] = [];

  for (const request of input.requests) {
    if (request.archived) continue;
    const occurredAt = toDate(request.submittedAt);
    if (!occurredAt) continue;
    rows.push({
      occurredAt,
      row: {
        id: request.id,
        scholarId: request.scholarId,
        scholarName: request.scholarName,
        scholarEmail: request.scholarEmail,
        program: request.program,
        year: request.year,
        kind: 'request',
        requestType: request.requestType,
        taskType: null,
        status: request.status,
        occurredAt: occurredAt.toISOString(),
        title: request.description,
      },
    });
  }

  for (const goal of input.goals) {
    if (!isGoalUpdate(goal)) continue;
    const occurredAt = toDate(goal.updatedAt);
    if (!occurredAt) continue;
    rows.push({
      occurredAt,
      row: {
        id: goal.id,
        scholarId: goal.scholarId,
        scholarName: goal.scholarName,
        scholarEmail: goal.scholarEmail,
        program: goal.program,
        year: goal.year,
        kind: 'goal_update',
        requestType: null,
        taskType: null,
        status: goal.status,
        occurredAt: occurredAt.toISOString(),
        title: goal.title,
      },
    });
  }

  for (const task of input.taskResponses) {
    if (task.deletedAt != null) continue;
    const occurredAt = toDate(task.submittedAt);
    if (!occurredAt) continue;
    rows.push({
      occurredAt,
      row: {
        id: task.id,
        scholarId: task.scholarId,
        scholarName: task.scholarName,
        scholarEmail: task.scholarEmail,
        program: task.program,
        year: task.year,
        kind: 'task_submission',
        requestType: null,
        taskType: task.taskType,
        status: task.taskStatus,
        occurredAt: occurredAt.toISOString(),
        title: task.taskTitle,
      },
    });
  }

  return rows;
}

function paginate(
  totalItems: number,
  query: SubmissionReportQuery,
  paginateRows: boolean
): { page: number; limit: number; start: number } {
  const limit = Math.min(
    query.limit && query.limit > 0 ? query.limit : SUBMISSION_REPORT_PAGE_SIZE,
    100
  );
  const requestedPage = query.page && query.page > 0 ? query.page : 1;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
  return {
    page: paginateRows ? page : 1,
    limit: paginateRows ? limit : Math.max(totalItems, 1),
    start: paginateRows ? (page - 1) * limit : 0,
  };
}

export function buildSubmissionReport(
  input: SubmissionReportInput,
  query: SubmissionReportQuery = {},
  options: {
    paginate?: boolean;
    filterOptions?: { programs: string[]; years: string[] };
  } = {}
): SubmissionReport {
  const paginateRows = options.paginate !== false;
  const filtered = collectRows(input)
    .filter((entry) => matchesQuery(entry, query))
    .sort((a, b) => {
      const byTime = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (byTime !== 0) return byTime;
      return a.row.id.localeCompare(b.row.id);
    });

  const byKind = emptyKindCounts();
  const months = new Map<string, SubmissionMonthBucket>();
  for (const entry of filtered) {
    byKind[entry.row.kind] += 1;
    const key = monthKey(entry.occurredAt);
    const bucket = months.get(key) ?? {
      month: key,
      request: 0,
      goal_update: 0,
      task_submission: 0,
    };
    bucket[entry.row.kind] += 1;
    months.set(key, bucket);
  }

  const window = paginate(filtered.length, query, paginateRows);
  const pageRows = paginateRows
    ? filtered.slice(window.start, window.start + window.limit)
    : filtered;
  const totalPages =
    filtered.length === 0
      ? 0
      : Math.ceil(filtered.length / (paginateRows ? window.limit : filtered.length));

  return {
    summary: {
      total: filtered.length,
      byKind,
    },
    series: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    rows: pageRows.map((entry) => entry.row),
    pagination: {
      page: window.page,
      limit: paginateRows ? window.limit : filtered.length,
      totalItems: filtered.length,
      totalPages: paginateRows ? totalPages : filtered.length > 0 ? 1 : 0,
      hasNext: paginateRows && window.page < totalPages,
      hasPrev: paginateRows && window.page > 1 && totalPages > 0,
    },
    filterOptions: options.filterOptions ?? { programs: [], years: [] },
  };
}

export function submissionReportToCsv(rows: SubmissionHistoryRow[]): string {
  const headers = [
    'Scholar',
    'Email',
    'Programme',
    'Year',
    'Kind',
    'Request type',
    'Task type',
    'Status',
    'Occurred at',
    'Title',
  ];
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(','),
    ...rows.map((row) =>
      [
        row.scholarName,
        row.scholarEmail,
        row.program,
        row.year,
        row.kind,
        row.requestType ?? '',
        row.taskType ?? '',
        row.status,
        row.occurredAt,
        row.title,
      ]
        .map((value) => escapeCsvValue(value))
        .join(',')
    ),
  ];
  return lines.join('\n');
}
