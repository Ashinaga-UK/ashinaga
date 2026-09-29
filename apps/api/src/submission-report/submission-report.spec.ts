import type {
  GoalSubmissionInput,
  RequestSubmissionInput,
  SubmissionReportInput,
  TaskSubmissionInput,
} from './submission-report';
import { buildSubmissionReport, submissionReportToCsv } from './submission-report';

const ada = {
  scholarId: 'scholar-ada',
  scholarName: 'Ada Scholar',
  scholarEmail: 'ada@example.com',
  program: 'Engineering',
  year: '2026',
};

const ben = {
  scholarId: 'scholar-ben',
  scholarName: 'Ben Scholar',
  scholarEmail: 'ben@example.com',
  program: 'Law',
  year: '2025',
};

function request(overrides: Partial<RequestSubmissionInput> = {}): RequestSubmissionInput {
  return {
    ...ada,
    id: 'request-pending',
    requestType: 'others',
    status: 'pending',
    submittedAt: '2026-03-02T00:00:00.000Z',
    archived: false,
    description: 'Laptop',
    ...overrides,
  };
}

function goal(overrides: Partial<GoalSubmissionInput> = {}): GoalSubmissionInput {
  return {
    ...ada,
    id: 'goal-updated',
    status: 'in_progress',
    title: 'Read more',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-05T00:00:00.000Z',
    ...overrides,
  };
}

function task(overrides: Partial<TaskSubmissionInput> = {}): TaskSubmissionInput {
  return {
    ...ada,
    id: 'response-pending',
    taskId: 'task-pending',
    taskStatus: 'pending',
    taskType: 'document_upload',
    taskTitle: 'Passport',
    deletedAt: null,
    submittedAt: '2026-03-11T00:00:00.000Z',
    ...overrides,
  };
}

function input(overrides: Partial<SubmissionReportInput> = {}): SubmissionReportInput {
  return {
    requests: [
      request(),
      request({
        id: 'request-approved',
        status: 'approved',
        requestType: 'summer_funding_request',
        description: 'Grant',
        submittedAt: '2026-02-01T00:00:00.000Z',
      }),
      request({
        id: 'request-reviewed',
        status: 'reviewed',
        description: 'Reviewed note',
        submittedAt: '2026-03-03T00:00:00.000Z',
      }),
      request({
        id: 'request-archived',
        archived: true,
        description: 'Archived',
      }),
    ],
    goals: [
      goal(),
      goal({
        id: 'goal-untouched',
        title: 'Never edited',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
    ],
    taskResponses: [
      task(),
      task({
        id: 'response-completed',
        taskId: 'task-completed',
        taskStatus: 'completed',
        taskType: 'goal_update',
        taskTitle: 'Update goals',
        submittedAt: '2026-03-10T00:00:00.000Z',
      }),
      task({
        id: 'response-deleted',
        taskId: 'task-deleted',
        taskTitle: 'Deleted task',
        deletedAt: '2026-03-12T00:00:00.000Z',
      }),
      task({
        ...ben,
        id: 'response-ben',
        taskId: 'task-ben',
        taskTitle: 'Ben task',
        submittedAt: '2026-01-15T00:00:00.000Z',
      }),
    ],
    ...overrides,
  };
}

describe('buildSubmissionReport', () => {
  it('counts only live requests, edited goals, and responses on tasks that are not deleted', () => {
    const report = buildSubmissionReport(input());

    expect(report.summary).toEqual({
      total: 7,
      byKind: { request: 3, goal_update: 1, task_submission: 3 },
    });
    expect(report.rows.map((row) => row.id)).toEqual([
      'response-pending',
      'response-completed',
      'goal-updated',
      'request-reviewed',
      'request-pending',
      'request-approved',
      'response-ben',
    ]);
    expect(report.rows.find((row) => row.id === 'response-completed')?.kind).toBe(
      'task_submission'
    );
  });

  it('keeps reviewed requests in the full mix and limits approved to approved requests', () => {
    const all = buildSubmissionReport(input());
    const approved = buildSubmissionReport(input(), { status: 'approved' });

    expect(all.rows.map((row) => row.id)).toContain('request-reviewed');
    expect(approved.summary).toEqual({
      total: 1,
      byKind: { request: 1, goal_update: 0, task_submission: 0 },
    });
    expect(approved.rows.map((row) => row.id)).toEqual(['request-approved']);
  });

  it('treats pending as open requests, open goals, and unfinished task responses', () => {
    const report = buildSubmissionReport(input(), { status: 'pending' });

    expect(report.rows.map((row) => row.id).sort()).toEqual([
      'goal-updated',
      'request-pending',
      'response-ben',
      'response-pending',
    ]);
  });

  it('applies request type only to requests', () => {
    const report = buildSubmissionReport(input(), { requestType: 'others' });

    expect(report.rows.map((row) => row.id).sort()).toEqual([
      'request-pending',
      'request-reviewed',
    ]);
  });

  it('includes the whole UTC end day and filters by cohort', () => {
    const ranged = buildSubmissionReport(input(), { from: '2026-03-10', to: '2026-03-11' });
    const cohort = buildSubmissionReport(input(), { program: 'Law', year: '2025' });

    expect(ranged.rows.map((row) => row.id).sort()).toEqual([
      'response-completed',
      'response-pending',
    ]);
    expect(cohort.rows.map((row) => row.id)).toEqual(['response-ben']);
    expect(ranged.series).toEqual([
      { month: '2026-03', request: 0, goal_update: 0, task_submission: 2 },
    ]);
  });

  it('pages the history without changing the totals', () => {
    const report = buildSubmissionReport(input(), { page: 2, limit: 2 });

    expect(report.summary.total).toBe(7);
    expect(report.rows).toHaveLength(2);
    expect(report.pagination).toMatchObject({
      page: 2,
      limit: 2,
      totalItems: 7,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('exports the filtered rows and neutralises formula text', () => {
    const report = buildSubmissionReport(
      input({
        requests: [request({ description: '=cmd' })],
        goals: [],
        taskResponses: [],
      }),
      {},
      { paginate: false }
    );
    const csv = submissionReportToCsv(report.rows);

    expect(report.rows).toHaveLength(1);
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain(`"'=cmd"`);
  });
});
