import {
  activityRangeEnd,
  activityRangeStart,
  buildScholarActivityReport,
  type ScholarActivityScholarInput,
  scholarActivityReportToCsv,
} from './scholar-activity-report';

const now = new Date('2026-09-29T12:00:00.000Z');

function scholar(
  overrides: Partial<ScholarActivityScholarInput> &
    Pick<ScholarActivityScholarInput, 'scholarId' | 'name'>
): ScholarActivityScholarInput {
  return {
    email: `${overrides.scholarId}@example.com`,
    status: 'active',
    program: 'Law',
    year: '2026',
    programStage: 'scholar',
    nationality: 'Uganda',
    lastActivity: null,
    tasksAssigned: 0,
    tasksCompleted: 0,
    tasksCompletedInRange: 0,
    tasksBehind: 0,
    goalsTotal: 0,
    goalsCompleted: 0,
    goalsUpdatedInRange: 0,
    avgCompletionScale: null,
    ...overrides,
  };
}

describe('buildScholarActivityReport', () => {
  const ada = scholar({
    scholarId: 'ada',
    name: 'Ada',
    lastActivity: '2026-07-01T12:00:00.000Z',
    tasksAssigned: 2,
    tasksCompleted: 1,
    tasksCompletedInRange: 0,
    tasksBehind: 1,
    goalsTotal: 2,
    goalsCompleted: 1,
    goalsUpdatedInRange: 1,
    avgCompletionScale: 6.24,
  });
  const ben = scholar({
    scholarId: 'ben',
    name: 'Ben',
    nationality: 'Kenya',
    lastActivity: null,
    tasksAssigned: 0,
  });
  const cia = scholar({
    scholarId: 'cia',
    name: 'Cia',
    lastActivity: '2026-09-28T12:00:00.000Z',
    tasksAssigned: 1,
    tasksCompleted: 0,
    tasksBehind: 0,
  });

  it('treats a missing last_activity as unknown and a timestamp older than 30 days as stale', () => {
    const report = buildScholarActivityReport([ada, ben, cia], [], {}, now);

    const adaRow = report.scholars.find((row) => row.scholarId === 'ada');
    const benRow = report.scholars.find((row) => row.scholarId === 'ben');
    const ciaRow = report.scholars.find((row) => row.scholarId === 'cia');

    expect(adaRow?.isStaleLogin).toBe(true);
    expect(adaRow?.lastActivityUnknown).toBe(false);
    expect(adaRow?.taskCompletionRate).toBe(50);
    expect(adaRow?.avgCompletionScale).toBe(6.2);
    expect(benRow?.isStaleLogin).toBe(false);
    expect(benRow?.lastActivityUnknown).toBe(true);
    expect(benRow?.taskCompletionRate).toBeNull();
    expect(ciaRow?.isStaleLogin).toBe(false);
    expect(report.summary).toEqual({
      scholarCount: 3,
      staleLoginCount: 1,
      unknownLoginCount: 1,
      scholarsBehindOnTasks: 1,
      avgTaskCompletionRate: 33,
    });
  });

  it('does not mark a scholar stale at exactly 30 days', () => {
    const exact = scholar({
      scholarId: 'exact',
      name: 'Exact',
      lastActivity: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    });
    const report = buildScholarActivityReport([exact], [], {}, now);
    expect(report.scholars[0]?.isStaleLogin).toBe(false);
    expect(report.scholars[0]?.daysSinceActivity).toBe(30);
  });

  it('lists the cohort with the higher stale share first and weights completion by assigned tasks', () => {
    const quiet = scholar({
      scholarId: 'quiet',
      name: 'Quiet',
      program: 'Medicine',
      year: '2025',
      lastActivity: '2026-01-01T00:00:00.000Z',
      tasksAssigned: 1,
      tasksCompleted: 1,
    });
    const report = buildScholarActivityReport([ada, ben, cia, quiet], [], {}, now);
    expect(report.cohorts.map((cohort) => `${cohort.program}:${cohort.year}`)).toEqual([
      'Medicine:2025',
      'Law:2026',
    ]);
    const law = report.cohorts.find((cohort) => cohort.program === 'Law');
    expect(law).toMatchObject({
      scholarCount: 3,
      staleLoginCount: 1,
      unknownLoginCount: 1,
      scholarsBehindOnTasks: 1,
      avgTaskCompletionRate: 33,
    });
  });

  it('sorts completion with null rates last', () => {
    const report = buildScholarActivityReport(
      [ada, ben, cia],
      [],
      {
        sortBy: 'taskCompletionRate',
        sortOrder: 'asc',
      },
      now
    );
    expect(report.scholars.map((row) => row.name)).toEqual(['Cia', 'Ada', 'Ben']);
  });

  it('exports activity labels without counting unknown as stale', () => {
    const report = buildScholarActivityReport([ada, ben], [ada, ben], {}, now);
    const csv = scholarActivityReportToCsv(report);
    expect(csv).toContain('No activity in 30 days');
    expect(csv).toContain('Unknown');
    expect(csv).toContain('50%');
    expect(report.filterOptions.nationalities).toEqual(['Kenya', 'Uganda']);
  });
});

describe('activity date range', () => {
  it('includes a date-only end through the end of that UTC day', () => {
    expect(activityRangeStart('2026-09-01')?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(activityRangeEnd('2026-09-01')?.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(activityRangeEnd('2026-09-01T15:00:00.000Z')?.toISOString()).toBe(
      '2026-09-01T15:00:00.000Z'
    );
    expect(activityRangeStart(undefined)).toBeNull();
  });
});
