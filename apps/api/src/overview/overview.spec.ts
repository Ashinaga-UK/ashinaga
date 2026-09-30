import { buildOverview, OVERVIEW_ATTENTION_CAP, type OverviewBuildInput } from './overview';

const now = new Date('2026-09-29T12:00:00.000Z');

function input(overrides: Partial<OverviewBuildInput> = {}): OverviewBuildInput {
  return {
    now,
    scholarStats: { total: 10 },
    prepYearCount: 0,
    prepScholars: [],
    tasks: [],
    requests: [],
    scholars: [],
    drafts: [],
    followUpDays: 14,
    ...overrides,
  };
}

describe('buildOverview', () => {
  it('returns an empty attention list and no Prep Year panel when nothing needs attention', () => {
    const result = buildOverview(input());

    expect(result.attention).toEqual({
      items: [],
      total: 0,
      truncated: false,
      counts: { action: 0, follow: 0, prep: 0, reviews: 0 },
    });
    expect(result.prepYear).toBeNull();
    expect(result.cohort).toEqual({ total: 10, prepYear: 0 });
    expect(result.followUpDays).toBe(14);
  });

  it('ranks overdue tasks, then due today, then the oldest pending request', () => {
    const result = buildOverview(
      input({
        tasks: [
          {
            id: 'due',
            title: 'Supervisor meeting notes',
            dueDate: '2026-09-29T00:00:00.000Z',
            status: 'pending',
            scholarId: 's-due',
            scholarName: 'Lina Mensah',
          },
          {
            id: 'late-3',
            title: 'IELTS registration',
            dueDate: '2026-09-26T00:00:00.000Z',
            status: 'in_progress',
            scholarId: 's-3',
            scholarName: 'James Okonkwo',
          },
          {
            id: 'late-6',
            title: 'Personal statement draft',
            dueDate: '2026-09-23T00:00:00.000Z',
            status: 'pending',
            scholarId: 's-6',
            scholarName: 'Amina Diallo',
          },
          {
            id: 'done',
            title: 'Completed task',
            dueDate: '2026-09-01T00:00:00.000Z',
            status: 'completed',
            scholarId: 's-done',
            scholarName: 'Done Scholar',
          },
          {
            id: 'future',
            title: 'Next week',
            dueDate: '2026-10-06T00:00:00.000Z',
            status: 'pending',
            scholarId: 's-future',
            scholarName: 'Future Scholar',
          },
        ],
        requests: [
          {
            id: 'req-new',
            type: 'summer_funding_request',
            submittedDate: '2026-09-18T00:00:00.000Z',
            scholarId: 's-req',
            scholarName: 'Sofia Rahman',
          },
          {
            id: 'req-old',
            type: 'requirement_submission',
            submittedDate: '2026-09-01T00:00:00.000Z',
            scholarId: 's-old',
            scholarName: 'Older Request',
          },
        ],
      })
    );

    expect(result.attention.items.map((item) => item.id)).toEqual([
      'overdue_task:late-6',
      'overdue_task:late-3',
      'due_today:due',
      'pending_request:req-old',
      'pending_request:req-new',
    ]);
    expect(result.attention.items[0]).toMatchObject({
      title: 'Personal statement draft',
      meta: { daysOverdue: 6 },
      href: '/?tab=scholars&view=scholar-profile&scholarId=s-6&scholarTab=tasks',
    });
    expect(result.attention.items[3]?.href).toBe('/?tab=requests&status=pending&requestId=req-old');
    expect(result.attention.items[3]?.title).toBe('Requirement Submission');
  });

  it('lists stale scholars only past the inactivity threshold and ignores a missing login date', () => {
    const result = buildOverview(
      input({
        scholars: [
          { id: 'unknown', name: 'Never Seen', lastActivity: null },
          { id: 'recent', name: 'Recent', lastActivity: '2026-09-20T12:00:00.000Z' },
          { id: 'quiet', name: 'David Kariuki', lastActivity: '2026-09-08T12:00:00.000Z' },
        ],
      })
    );

    expect(result.attention.items).toEqual([
      expect.objectContaining({
        id: 'stale_scholar:quiet',
        type: 'stale_scholar',
        title: 'No activity for 21 days',
        href: '/?tab=scholars&view=scholar-profile&scholarId=quiet',
      }),
    ]);
  });

  it('adds Prep Year gaps and a snapshot only for active candidates', () => {
    const result = buildOverview(
      input({
        prepYearCount: 2,
        prepScholars: [
          {
            scholarId: 'active',
            name: 'Hannah Bekele',
            status: 'active',
            intendedUniversity: 'UCL',
            intendedCourse: ' ',
            degreePathway: 'Law',
            overdueCount: 2,
            missingDocumentCount: 3,
            incompletePlatformCount: 2,
            missingDocuments: ['Passport', 'IELTS', 'Transcript'],
            incompletePlatforms: ['Coursera', 'University email'],
          },
          {
            scholarId: 'archived',
            name: 'Archived Candidate',
            status: 'archived',
            intendedUniversity: null,
            intendedCourse: null,
            degreePathway: null,
            overdueCount: 9,
            missingDocumentCount: 4,
            incompletePlatformCount: 1,
            missingDocuments: ['Passport'],
            incompletePlatforms: ['Coursera'],
          },
        ],
      })
    );

    expect(result.cohort.prepYear).toBe(2);
    expect(result.prepYear?.candidateCount).toBe(1);
    expect(result.prepYear?.gaps.map((gap) => gap.title)).toEqual([
      'Passport, IELTS, and Transcript missing',
      'Coursera and University email still pending',
      'Intended course empty',
      '2 overdue tasks',
    ]);
    expect(result.prepYear?.gaps[0]?.href).toContain('scholarTab=documents');
    expect(result.prepYear?.gaps[2]?.href).toBe(
      '/?tab=scholars&view=scholar-profile&scholarId=active'
    );
    expect(result.prepYear?.gaps[3]?.href).toContain('scholarTab=tasks');
    expect(result.attention.items.map((item) => item.type)).toEqual([
      'missing_document',
      'incomplete_platform',
    ]);
    expect(result.attention.items[0]?.href).toContain('scholarTab=documents');
    expect(result.attention.items[0]?.title).toBe('Passport, IELTS, and Transcript missing');
  });

  it('lists draft annual reviews without inventing a missing year', () => {
    const result = buildOverview(
      input({
        drafts: [
          {
            id: 'draft-1',
            scholarId: 's-maya',
            scholarName: 'Maya Chen',
            academicYear: '2025/2026',
          },
        ],
      })
    );

    expect(result.attention.items).toEqual([
      expect.objectContaining({
        id: 'annual_review_draft:draft-1',
        title: 'Annual review draft',
        meta: { academicYear: '2025/2026' },
        href: '/?tab=scholars&view=scholar-profile&scholarId=s-maya&scholarTab=annual-reviews',
      }),
    ]);
  });

  it('caps the list and reports how many items were left out', () => {
    const tasks = Array.from({ length: OVERVIEW_ATTENTION_CAP + 1 }, (_, index) => ({
      id: `task-${index}`,
      title: `Task ${index}`,
      dueDate: '2026-09-01T00:00:00.000Z',
      status: 'pending',
      scholarId: `scholar-${index}`,
      scholarName: `Scholar ${String(index).padStart(2, '0')}`,
    }));

    const result = buildOverview(input({ tasks }));

    expect(result.attention.items).toHaveLength(OVERVIEW_ATTENTION_CAP);
    expect(result.attention.total).toBe(OVERVIEW_ATTENTION_CAP + 1);
    expect(result.attention.truncated).toBe(true);
    expect(result.attention.counts.action).toBe(OVERVIEW_ATTENTION_CAP + 1);
  });

  it('keeps later views when an earlier view is over the cap', () => {
    const tasks = Array.from({ length: OVERVIEW_ATTENTION_CAP + 1 }, (_, index) => ({
      id: `task-${index}`,
      title: `Task ${index}`,
      dueDate: '2026-09-01T00:00:00.000Z',
      status: 'pending',
      scholarId: `scholar-${index}`,
      scholarName: `Scholar ${String(index).padStart(2, '0')}`,
    }));

    const result = buildOverview(
      input({
        tasks,
        scholars: [
          { id: 'quiet', name: 'David Kariuki', lastActivity: '2026-09-08T12:00:00.000Z' },
        ],
      })
    );

    expect(result.attention.items.some((item) => item.id === 'stale_scholar:quiet')).toBe(true);
    expect(result.attention.counts.follow).toBe(1);
  });

  it('keeps named overdue prep tasks when other gaps fill the cap', () => {
    const prepScholars = Array.from({ length: 60 }, (_, index) => ({
      scholarId: `prep-${index}`,
      name: `Candidate ${String(index).padStart(2, '0')}`,
      status: 'active' as const,
      intendedUniversity: 'UCL',
      intendedCourse: 'Law',
      degreePathway: 'Undergraduate',
      overdueCount: index < 5 ? 1 : 0,
      missingDocumentCount: 1,
      incompletePlatformCount: 0,
      missingDocuments: ['Passport'],
      incompletePlatforms: [],
    }));
    const tasks = Array.from({ length: 5 }, (_, index) => ({
      id: `overdue-${index}`,
      title: `Overdue task ${index}`,
      dueDate: '2026-09-01T00:00:00.000Z',
      status: 'pending',
      scholarId: `prep-${index}`,
      scholarName: `Candidate ${String(index).padStart(2, '0')}`,
    }));

    const result = buildOverview(input({ prepYearCount: 60, prepScholars, tasks }));

    expect(result.prepYear?.truncated).toBe(true);
    expect(result.prepYear?.total).toBe(65);
    expect(result.prepYear?.gaps).toHaveLength(OVERVIEW_ATTENTION_CAP);
    expect(result.prepYear?.gaps.slice(0, 5).map((gap) => gap.id)).toEqual([
      'overdue_task:overdue-0',
      'overdue_task:overdue-1',
      'overdue_task:overdue-2',
      'overdue_task:overdue-3',
      'overdue_task:overdue-4',
    ]);
    expect(result.prepYear?.gaps.slice(0, 5).every((gap) => gap.kind === 'overdue_task')).toBe(
      true
    );
  });
});
