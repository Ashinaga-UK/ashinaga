import { isTaskOverdue } from '../tasks/task-due';
import { normalizePhase } from '../tasks/task-evidence';
import { escapeCsvValue } from '../utils/csv';

export type PrepYearReportScholarStatus = 'active' | 'inactive' | 'on_hold' | 'archived';
export type PrepYearDocumentStatus = 'submitted' | 'missing';
export type PrepYearPlatformStatus = 'yes' | 'no' | 'pending';
export type PrepYearReportTaskStatus = 'pending' | 'in_progress' | 'completed';

export type PrepYearReportFilters = {
  scholarId?: string;
  phase?: string;
};

export type PrepYearReportDocumentType = {
  id: string;
  slug: string;
  label: string;
};

export type PrepYearReportPlatform = {
  id: string;
  slug: string;
  name: string;
};

export type PrepYearReportScholarInput = {
  scholarId: string;
  name: string;
  email: string;
  status: PrepYearReportScholarStatus;
  intendedUniversity: string | null;
  intendedCourse: string | null;
  degreePathway: string | null;
};

export type PrepYearReportTaskInput = {
  scholarId: string;
  phase: string | null;
  dueDate: Date | string;
  status: PrepYearReportTaskStatus;
};

export type PrepYearReportDocumentFileInput = {
  scholarId: string;
  typeId: string;
};

export type PrepYearReportPlatformSetupInput = {
  scholarId: string;
  platformId: string;
  status: PrepYearPlatformStatus;
};

export type PrepYearReportRow = {
  scholarId: string;
  name: string;
  email: string;
  status: PrepYearReportScholarStatus;
  intendedUniversity: string | null;
  intendedCourse: string | null;
  degreePathway: string | null;
  assignedCount: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number | null;
  documents: Record<string, PrepYearDocumentStatus>;
  platforms: Record<string, PrepYearPlatformStatus>;
};

export type PrepYearReportPayload = {
  documentTypes: PrepYearReportDocumentType[];
  platforms: PrepYearReportPlatform[];
  scholars: PrepYearReportRow[];
  summary: {
    scholarCount: number;
    overdueCount: number;
    missingDocumentCount: number;
    completedTaskCount: number;
  };
  filterOptions: {
    phases: string[];
    scholars: Array<{ scholarId: string; name: string }>;
  };
};

function completionRate(completedCount: number, assignedCount: number): number | null {
  if (assignedCount === 0) return null;
  return Math.round((completedCount / assignedCount) * 100);
}

function taskMatchesPhase(task: PrepYearReportTaskInput, phaseFilter: string | null): boolean {
  if (!phaseFilter) return true;
  return normalizePhase(task.phase) === phaseFilter;
}

export function buildPrepYearReport(
  scholars: PrepYearReportScholarInput[],
  documentTypes: PrepYearReportDocumentType[],
  documentFiles: PrepYearReportDocumentFileInput[],
  platforms: PrepYearReportPlatform[],
  platformSetups: PrepYearReportPlatformSetupInput[],
  tasks: PrepYearReportTaskInput[],
  filters: PrepYearReportFilters = {},
  now = new Date()
): PrepYearReportPayload {
  const phaseFilter = normalizePhase(filters.phase);
  const submitted = new Set(documentFiles.map((file) => `${file.scholarId}:${file.typeId}`));
  const setupByScholarPlatform = new Map(
    platformSetups.map((row) => [`${row.scholarId}:${row.platformId}`, row.status])
  );

  const tasksByScholar = new Map<string, PrepYearReportTaskInput[]>();
  for (const task of tasks) {
    if (!taskMatchesPhase(task, phaseFilter)) continue;
    const group = tasksByScholar.get(task.scholarId) ?? [];
    group.push(task);
    tasksByScholar.set(task.scholarId, group);
  }

  const allRows = scholars.map((scholar) => {
    const scholarTasks = tasksByScholar.get(scholar.scholarId) ?? [];
    let completedCount = 0;
    let overdueCount = 0;
    for (const task of scholarTasks) {
      if (task.status === 'completed') completedCount += 1;
      if (isTaskOverdue(task, now)) overdueCount += 1;
    }

    const documents: Record<string, PrepYearDocumentStatus> = {};
    for (const type of documentTypes) {
      documents[type.id] = submitted.has(`${scholar.scholarId}:${type.id}`)
        ? 'submitted'
        : 'missing';
    }

    const platformStatuses: Record<string, PrepYearPlatformStatus> = {};
    for (const platform of platforms) {
      platformStatuses[platform.id] =
        setupByScholarPlatform.get(`${scholar.scholarId}:${platform.id}`) ?? 'pending';
    }

    return {
      scholarId: scholar.scholarId,
      name: scholar.name,
      email: scholar.email,
      status: scholar.status,
      intendedUniversity: scholar.intendedUniversity,
      intendedCourse: scholar.intendedCourse,
      degreePathway: scholar.degreePathway,
      assignedCount: scholarTasks.length,
      completedCount,
      overdueCount,
      completionRate: completionRate(completedCount, scholarTasks.length),
      documents,
      platforms: platformStatuses,
    } satisfies PrepYearReportRow;
  });

  const visibleRows = filters.scholarId
    ? allRows.filter((row) => row.scholarId === filters.scholarId)
    : allRows;

  let overdueCount = 0;
  let missingDocumentCount = 0;
  let completedTaskCount = 0;
  for (const row of visibleRows) {
    overdueCount += row.overdueCount;
    completedTaskCount += row.completedCount;
    for (const type of documentTypes) {
      if (row.documents[type.id] === 'missing') missingDocumentCount += 1;
    }
  }

  const phases = [
    ...new Set(
      tasks
        .map((task) => normalizePhase(task.phase))
        .filter((phase): phase is string => Boolean(phase))
    ),
  ].sort((a, b) => a.localeCompare(b, 'en-GB'));

  return {
    documentTypes,
    platforms,
    scholars: visibleRows,
    summary: {
      scholarCount: visibleRows.length,
      overdueCount,
      missingDocumentCount,
      completedTaskCount,
    },
    filterOptions: {
      phases,
      scholars: scholars.map((scholar) => ({
        scholarId: scholar.scholarId,
        name: scholar.name,
      })),
    },
  };
}

export function prepYearReportToCsv(payload: PrepYearReportPayload): string {
  const headers = [
    'Name',
    'Email',
    'Status',
    'Intended University',
    'Intended Course',
    'Degree Pathway',
    'Tasks assigned',
    'Tasks completed',
    'Tasks overdue',
    'Completion rate',
    ...payload.documentTypes.map((type) => type.label),
    ...payload.platforms.map((platform) => platform.name),
  ];

  const rows = payload.scholars.map((row) => [
    row.name,
    row.email,
    row.status,
    row.intendedUniversity ?? '',
    row.intendedCourse ?? '',
    row.degreePathway ?? '',
    row.assignedCount,
    row.completedCount,
    row.overdueCount,
    row.completionRate == null ? '' : `${row.completionRate}%`,
    ...payload.documentTypes.map((type) => row.documents[type.id] ?? 'missing'),
    ...payload.platforms.map((platform) => row.platforms[platform.id] ?? 'pending'),
  ]);

  return [headers, ...rows]
    .map((cells) => cells.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');
}
