import type { PrepTaskCohortTaskInput } from './prep-task-cohort';
import { buildPrepTaskCohortMatrix, prepTaskColumnKey } from './prep-task-cohort';

const now = new Date('2026-09-04T12:00:00.000Z');

function task(
  overrides: Partial<PrepTaskCohortTaskInput> & Pick<PrepTaskCohortTaskInput, 'id'>
): PrepTaskCohortTaskInput {
  return {
    scholarId: 's1',
    title: 'Connect signup',
    phase: 'english',
    dueDate: '2026-10-01T00:00:00.000Z',
    assignmentGroupId: '11111111-1111-4111-8111-111111111111',
    requiresResponse: false,
    requiresAttachment: false,
    requiresLink: false,
    status: 'pending',
    completedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const scholars = [
  { scholarId: 's1', name: 'Ada Candidate', email: 'ada@example.com', status: 'active' as const },
  { scholarId: 's2', name: 'Ben Candidate', email: 'ben@example.com', status: 'on_hold' as const },
];

describe('prepTaskColumnKey', () => {
  it('uses assignmentGroupId when present', () => {
    expect(prepTaskColumnKey(task({ id: 't1' }))).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('groups individual tasks by normalized phase, title, and UTC day', () => {
    expect(
      prepTaskColumnKey(
        task({
          id: 't1',
          assignmentGroupId: null,
          phase: ' English ',
          title: 'Essay',
          dueDate: '2026-10-01T23:30:00.000Z',
        })
      )
    ).toBe('indiv:english:Essay:2026-10-01');
  });
});

describe('buildPrepTaskCohortMatrix', () => {
  it('groups bulk-assigned tasks into one column and fills unassigned cells', () => {
    const payload = buildPrepTaskCohortMatrix(
      scholars,
      [
        task({ id: 't1', scholarId: 's1', status: 'pending' }),
        task({ id: 't2', scholarId: 's2', status: 'in_progress' }),
      ],
      {},
      now
    );

    expect(payload.columns).toHaveLength(1);
    expect(payload.columns[0]?.key).toBe('11111111-1111-4111-8111-111111111111');
    expect(payload.scholars[0]?.cells[0]).toEqual(
      expect.objectContaining({ taskId: 't1', status: 'pending', overdue: false })
    );
    expect(payload.scholars[1]?.cells[0]).toEqual(
      expect.objectContaining({ taskId: 't2', status: 'in_progress', overdue: false })
    );
    expect(payload.scholars.map((row) => row.status)).toEqual(['active', 'on_hold']);
  });

  it('keeps scholar rows when there are no task columns', () => {
    const payload = buildPrepTaskCohortMatrix(scholars, [], {}, now);
    expect(payload.columns).toEqual([]);
    expect(payload.scholars).toHaveLength(2);
    expect(payload.summary).toEqual({
      scholarCount: 2,
      columnCount: 0,
      overdueCount: 0,
      completedCount: 0,
    });
  });

  it('keeps one cell per scholar/column and prefers the latest updatedAt', () => {
    const payload = buildPrepTaskCohortMatrix(
      [scholars[0]],
      [
        task({
          id: 'old',
          assignmentGroupId: null,
          title: 'Essay',
          updatedAt: '2026-08-01T00:00:00.000Z',
          status: 'pending',
        }),
        task({
          id: 'new',
          assignmentGroupId: null,
          title: 'Essay',
          updatedAt: '2026-08-20T00:00:00.000Z',
          status: 'in_progress',
        }),
      ],
      {},
      now
    );

    expect(payload.columns).toHaveLength(1);
    expect(payload.scholars[0]?.cells).toHaveLength(1);
    expect(payload.scholars[0]?.cells[0]?.taskId).toBe('new');
    expect(payload.scholars[0]?.cells[0]?.status).toBe('in_progress');
  });

  it('overlays overdue via isTaskOverdue and never marks completed overdue', () => {
    const payload = buildPrepTaskCohortMatrix(
      scholars,
      [
        task({
          id: 'late',
          scholarId: 's1',
          dueDate: '2026-08-01T00:00:00.000Z',
          status: 'pending',
        }),
        task({
          id: 'done',
          scholarId: 's2',
          dueDate: '2026-08-01T00:00:00.000Z',
          status: 'completed',
          completedAt: '2026-08-15T00:00:00.000Z',
        }),
      ],
      {},
      now
    );

    expect(payload.scholars[0]?.cells[0]?.overdue).toBe(true);
    expect(payload.scholars[1]?.cells[0]?.overdue).toBe(false);
    expect(payload.summary.overdueCount).toBe(1);
    expect(payload.summary.completedCount).toBe(1);
  });

  it('adds unassigned cells when a scholar has no task for a column', () => {
    const payload = buildPrepTaskCohortMatrix(
      scholars,
      [task({ id: 't1', scholarId: 's1' })],
      {},
      now
    );

    expect(payload.scholars[1]?.cells[0]).toEqual({
      columnKey: '11111111-1111-4111-8111-111111111111',
      taskId: null,
      status: null,
      overdue: false,
      completedAt: null,
    });
  });

  it('drops non-matching columns when filtering by normalized phase', () => {
    const payload = buildPrepTaskCohortMatrix(
      scholars,
      [
        task({ id: 'english', phase: 'english' }),
        task({
          id: 'proposal',
          assignmentGroupId: '22222222-2222-4222-8222-222222222222',
          title: 'Draft proposal',
          phase: 'proposal',
        }),
      ],
      { phase: ' English ' },
      now
    );

    expect(payload.columns.map((column) => column.phase)).toEqual(['english']);
    expect(payload.filterOptions.columns).toHaveLength(2);
  });

  it('matches a phase filter against mixed-case stored phases', () => {
    const payload = buildPrepTaskCohortMatrix(
      [scholars[0]],
      [task({ id: 'legacy', assignmentGroupId: null, phase: 'English', title: 'Essay' })],
      { phase: 'english' },
      now
    );

    expect(payload.columns).toHaveLength(1);
    expect(payload.columns[0]?.title).toBe('Essay');
  });

  it('keeps rows with any overdue cell, or only that column when a column filter is set', () => {
    const overdueGroup = '11111111-1111-4111-8111-111111111111';
    const laterGroup = '22222222-2222-4222-8222-222222222222';
    const tasks = [
      task({
        id: 's1-late',
        scholarId: 's1',
        assignmentGroupId: overdueGroup,
        dueDate: '2026-08-01T00:00:00.000Z',
      }),
      task({
        id: 's2-ok',
        scholarId: 's2',
        assignmentGroupId: overdueGroup,
        dueDate: '2026-10-01T00:00:00.000Z',
      }),
      task({
        id: 's2-late',
        scholarId: 's2',
        assignmentGroupId: laterGroup,
        title: 'Draft proposal',
        dueDate: '2026-08-01T00:00:00.000Z',
      }),
    ];

    const anyOverdue = buildPrepTaskCohortMatrix(scholars, tasks, { state: 'overdue' }, now);
    expect(anyOverdue.scholars.map((row) => row.scholarId)).toEqual(['s1', 's2']);

    const columnOverdue = buildPrepTaskCohortMatrix(
      scholars,
      tasks,
      { assignmentGroupId: overdueGroup, state: 'overdue' },
      now
    );
    expect(columnOverdue.columns).toHaveLength(1);
    expect(columnOverdue.scholars.map((row) => row.scholarId)).toEqual(['s1']);
  });

  it('sorts columns by phase (nulls last), due date, then title', () => {
    const payload = buildPrepTaskCohortMatrix(
      [scholars[0]],
      [
        task({
          id: 'none',
          assignmentGroupId: '33333333-3333-4333-8333-333333333333',
          title: 'Ad hoc',
          phase: null,
          dueDate: '2026-09-01T00:00:00.000Z',
        }),
        task({
          id: 'later',
          assignmentGroupId: '22222222-2222-4222-8222-222222222222',
          title: 'Beta',
          phase: 'english',
          dueDate: '2026-11-01T00:00:00.000Z',
        }),
        task({
          id: 'earlier',
          assignmentGroupId: '11111111-1111-4111-8111-111111111111',
          title: 'Alpha',
          phase: 'english',
          dueDate: '2026-10-01T00:00:00.000Z',
        }),
      ],
      {},
      now
    );

    expect(payload.columns.map((column) => column.title)).toEqual(['Alpha', 'Beta', 'Ad hoc']);
  });

  it('returns an empty payload when there are no scholars', () => {
    const payload = buildPrepTaskCohortMatrix([], [], {}, now);
    expect(payload).toEqual({
      columns: [],
      scholars: [],
      summary: { scholarCount: 0, columnCount: 0, overdueCount: 0, completedCount: 0 },
      filterOptions: { phases: [], columns: [], scholars: [] },
    });
  });
});
