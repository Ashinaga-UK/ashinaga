import { isTaskOverdue } from './task-due';
import { normalizePhase } from './task-evidence';

export const PREP_TASK_COHORT_STATES = [
  'not_started',
  'in_progress',
  'completed',
  'overdue',
  'unassigned',
] as const;

export type PrepTaskCohortState = (typeof PREP_TASK_COHORT_STATES)[number];
export type PrepTaskCohortStatus = 'pending' | 'in_progress' | 'completed';

export type PrepTaskCohortFilters = {
  phase?: string;
  scholarId?: string;
  assignmentGroupId?: string;
  columnKey?: string;
  state?: PrepTaskCohortState;
};

export type PrepTaskCohortScholarStatus = 'active' | 'inactive' | 'on_hold' | 'archived';

export type PrepTaskCohortScholarInput = {
  scholarId: string;
  name: string;
  email: string;
  status: PrepTaskCohortScholarStatus;
};

export type PrepTaskCohortTaskInput = {
  id: string;
  scholarId: string;
  title: string;
  phase: string | null;
  dueDate: Date | string;
  assignmentGroupId: string | null;
  requiresResponse: boolean;
  requiresAttachment: boolean;
  requiresLink: boolean;
  status: PrepTaskCohortStatus;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type PrepTaskCohortColumn = {
  key: string;
  title: string;
  phase: string | null;
  dueDate: string;
  assignmentGroupId: string | null;
  requiresResponse: boolean;
  requiresAttachment: boolean;
  requiresLink: boolean;
};

export type PrepTaskCohortCell = {
  columnKey: string;
  taskId: string | null;
  status: PrepTaskCohortStatus | null;
  overdue: boolean;
  completedAt: string | null;
};

export type PrepTaskCohortPayload = {
  columns: PrepTaskCohortColumn[];
  scholars: Array<{
    scholarId: string;
    name: string;
    email: string;
    status: PrepTaskCohortScholarStatus;
    cells: PrepTaskCohortCell[];
  }>;
  summary: {
    scholarCount: number;
    columnCount: number;
    overdueCount: number;
    completedCount: number;
  };
  filterOptions: {
    phases: string[];
    columns: Array<{ key: string; title: string; phase: string | null }>;
    scholars: Array<{ scholarId: string; name: string }>;
  };
};

export function utcDayKey(dueDate: Date | string): string {
  return new Date(dueDate).toISOString().slice(0, 10);
}

export function prepTaskColumnKey(task: {
  assignmentGroupId: string | null;
  phase: string | null;
  title: string;
  dueDate: Date | string;
}): string {
  if (task.assignmentGroupId) {
    return task.assignmentGroupId;
  }
  return `indiv:${normalizePhase(task.phase) ?? ''}:${task.title}:${utcDayKey(task.dueDate)}`;
}

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return new Date(value).toISOString();
}

function timestamp(value: Date | string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isNewer(candidate: PrepTaskCohortTaskInput, current: PrepTaskCohortTaskInput): boolean {
  const updated = timestamp(candidate.updatedAt) - timestamp(current.updatedAt);
  if (updated !== 0) return updated > 0;
  return timestamp(candidate.createdAt) >= timestamp(current.createdAt);
}

function columnFromTask(task: PrepTaskCohortTaskInput, key: string): PrepTaskCohortColumn {
  return {
    key,
    title: task.title,
    phase: task.phase,
    dueDate: new Date(task.dueDate).toISOString(),
    assignmentGroupId: task.assignmentGroupId,
    requiresResponse: task.requiresResponse,
    requiresAttachment: task.requiresAttachment,
    requiresLink: task.requiresLink,
  };
}

function sortColumns(columns: PrepTaskCohortColumn[]): PrepTaskCohortColumn[] {
  return [...columns].sort((a, b) => {
    if (a.phase == null && b.phase != null) return 1;
    if (a.phase != null && b.phase == null) return -1;
    if (a.phase && b.phase && a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase, 'en-GB');
    }
    const due = a.dueDate.localeCompare(b.dueDate);
    if (due !== 0) return due;
    return a.title.localeCompare(b.title, 'en-GB');
  });
}

function cellMatchesState(cell: PrepTaskCohortCell, state: PrepTaskCohortState): boolean {
  switch (state) {
    case 'not_started':
      return cell.status === 'pending';
    case 'in_progress':
      return cell.status === 'in_progress';
    case 'completed':
      return cell.status === 'completed';
    case 'overdue':
      return cell.overdue;
    case 'unassigned':
      return cell.taskId == null;
    default:
      return false;
  }
}

function summarize(
  columns: PrepTaskCohortColumn[],
  scholars: PrepTaskCohortPayload['scholars']
): PrepTaskCohortPayload['summary'] {
  let overdueCount = 0;
  let completedCount = 0;
  for (const scholar of scholars) {
    for (const cell of scholar.cells) {
      if (cell.overdue) overdueCount += 1;
      if (cell.status === 'completed') completedCount += 1;
    }
  }
  return {
    scholarCount: scholars.length,
    columnCount: columns.length,
    overdueCount,
    completedCount,
  };
}

export function buildPrepTaskCohortMatrix(
  scholars: PrepTaskCohortScholarInput[],
  tasks: PrepTaskCohortTaskInput[],
  filters: PrepTaskCohortFilters = {},
  now = new Date()
): PrepTaskCohortPayload {
  const tasksByColumn = new Map<string, PrepTaskCohortTaskInput[]>();
  for (const task of tasks) {
    const key = prepTaskColumnKey(task);
    const group = tasksByColumn.get(key) ?? [];
    group.push(task);
    tasksByColumn.set(key, group);
  }

  const cellByScholarColumn = new Map<string, PrepTaskCohortTaskInput>();
  const columnMeta = new Map<string, PrepTaskCohortTaskInput>();

  for (const [key, group] of tasksByColumn) {
    let representative = group[0];
    if (!representative) continue;
    for (const task of group) {
      if (isNewer(task, representative)) {
        representative = task;
      }
      const cellKey = `${task.scholarId}:${key}`;
      const existing = cellByScholarColumn.get(cellKey);
      if (!existing || isNewer(task, existing)) {
        cellByScholarColumn.set(cellKey, task);
      }
    }
    columnMeta.set(key, representative);
  }

  const allColumns = sortColumns(
    [...columnMeta.entries()].map(([key, task]) => columnFromTask(task, key))
  );

  const phaseFilter = normalizePhase(filters.phase);
  let columns = allColumns;
  if (phaseFilter) {
    columns = columns.filter((column) => normalizePhase(column.phase) === phaseFilter);
  }
  if (filters.assignmentGroupId) {
    columns = columns.filter((column) => column.assignmentGroupId === filters.assignmentGroupId);
  }
  if (filters.columnKey) {
    columns = columns.filter((column) => column.key === filters.columnKey);
  }

  const scholarRows = (
    filters.scholarId
      ? scholars.filter((scholar) => scholar.scholarId === filters.scholarId)
      : scholars
  ).map((scholar) => {
    const cells = columns.map((column) => {
      const task = cellByScholarColumn.get(`${scholar.scholarId}:${column.key}`);
      if (!task) {
        return {
          columnKey: column.key,
          taskId: null,
          status: null,
          overdue: false,
          completedAt: null,
        } satisfies PrepTaskCohortCell;
      }
      return {
        columnKey: column.key,
        taskId: task.id,
        status: task.status,
        overdue: isTaskOverdue(task, now),
        completedAt: toIso(task.completedAt),
      } satisfies PrepTaskCohortCell;
    });
    return {
      scholarId: scholar.scholarId,
      name: scholar.name,
      email: scholar.email,
      status: scholar.status,
      cells,
    };
  });

  const filteredScholars = filters.state
    ? scholarRows.filter((row) => row.cells.some((cell) => cellMatchesState(cell, filters.state!)))
    : scholarRows;

  return {
    columns,
    scholars: filteredScholars,
    summary: summarize(columns, filteredScholars),
    filterOptions: {
      phases: [...new Set(allColumns.map((column) => column.phase).filter(Boolean))] as string[],
      columns: allColumns.map((column) => ({
        key: column.key,
        title: column.title,
        phase: column.phase,
      })),
      scholars: scholars.map((scholar) => ({
        scholarId: scholar.scholarId,
        name: scholar.name,
      })),
    },
  };
}
