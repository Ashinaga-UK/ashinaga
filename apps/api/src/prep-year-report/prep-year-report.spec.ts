import {
  buildPrepYearReport,
  type PrepYearReportDocumentType,
  type PrepYearReportPlatform,
  type PrepYearReportScholarInput,
  type PrepYearReportTaskInput,
  prepYearReportToCsv,
} from './prep-year-report';

const ielts: PrepYearReportDocumentType = {
  id: 'type-ielts',
  slug: 'ielts',
  label: 'IELTS results',
};
const passport: PrepYearReportDocumentType = {
  id: 'type-passport',
  slug: 'passport',
  label: 'Passport copy',
};
const coursera: PrepYearReportPlatform = {
  id: 'plat-coursera',
  slug: 'coursera',
  name: 'Coursera',
};
const email: PrepYearReportPlatform = {
  id: 'plat-email',
  slug: 'email',
  name: 'Email',
};

const ada: PrepYearReportScholarInput = {
  scholarId: 's-ada',
  name: 'Ada Candidate',
  email: 'ada@example.com',
  status: 'active',
  intendedUniversity: 'Oxford',
  intendedCourse: 'Law',
  degreePathway: 'Foundation Year',
};
const ben: PrepYearReportScholarInput = {
  scholarId: 's-ben',
  name: 'Ben Candidate',
  email: 'ben@example.com',
  status: 'on_hold',
  intendedUniversity: null,
  intendedCourse: null,
  degreePathway: null,
};

const now = new Date('2026-09-05T12:00:00.000Z');

function englishTask(
  scholarId: string,
  status: PrepYearReportTaskInput['status'],
  dueDate: string
): PrepYearReportTaskInput {
  return {
    scholarId,
    phase: 'english',
    dueDate,
    status,
  };
}

describe('buildPrepYearReport', () => {
  it('includes only the given scholars and computes rates, docs, and platforms', () => {
    const report = buildPrepYearReport(
      [ada, ben],
      [ielts, passport],
      [{ scholarId: ada.scholarId, typeId: ielts.id }],
      [coursera, email],
      [
        { scholarId: ada.scholarId, platformId: coursera.id, status: 'yes' },
        { scholarId: ada.scholarId, platformId: email.id, status: 'no' },
      ],
      [
        englishTask(ada.scholarId, 'completed', '2026-10-01T00:00:00.000Z'),
        englishTask(ada.scholarId, 'pending', '2020-01-01T00:00:00.000Z'),
        {
          scholarId: ada.scholarId,
          phase: 'proposal',
          dueDate: '2026-10-01T00:00:00.000Z',
          status: 'pending',
        },
      ],
      {},
      now
    );

    expect(report.scholars).toHaveLength(2);
    const adaRow = report.scholars.find((row) => row.scholarId === ada.scholarId);
    expect(adaRow).toMatchObject({
      assignedCount: 3,
      completedCount: 1,
      overdueCount: 1,
      completionRate: 33,
      intendedUniversity: 'Oxford',
      documents: { [ielts.id]: 'submitted', [passport.id]: 'missing' },
      platforms: { [coursera.id]: 'yes', [email.id]: 'no' },
    });

    const benRow = report.scholars.find((row) => row.scholarId === ben.scholarId);
    expect(benRow).toMatchObject({
      assignedCount: 0,
      completedCount: 0,
      overdueCount: 0,
      completionRate: null,
      documents: { [ielts.id]: 'missing', [passport.id]: 'missing' },
      platforms: { [coursera.id]: 'pending', [email.id]: 'pending' },
    });

    expect(report.summary).toEqual({
      scholarCount: 2,
      overdueCount: 1,
      missingDocumentCount: 3,
      completedTaskCount: 1,
    });
    expect(report.filterOptions.phases).toEqual(['english', 'proposal']);
    expect(report.filterOptions.scholars).toEqual([
      { scholarId: ada.scholarId, name: ada.name },
      { scholarId: ben.scholarId, name: ben.name },
    ]);
  });

  it('keeps all candidates when filtering by phase and rescopes rates', () => {
    const report = buildPrepYearReport(
      [ada, ben],
      [ielts],
      [],
      [],
      [],
      [
        englishTask(ada.scholarId, 'completed', '2026-10-01T00:00:00.000Z'),
        englishTask(ada.scholarId, 'pending', '2026-10-01T00:00:00.000Z'),
        {
          scholarId: ada.scholarId,
          phase: 'proposal',
          dueDate: '2020-01-01T00:00:00.000Z',
          status: 'pending',
        },
        {
          scholarId: ben.scholarId,
          phase: 'English',
          dueDate: '2026-10-01T00:00:00.000Z',
          status: 'completed',
        },
      ],
      { phase: 'english' },
      now
    );

    expect(report.scholars.map((row) => row.scholarId)).toEqual([ada.scholarId, ben.scholarId]);
    expect(report.scholars[0]).toMatchObject({
      scholarId: ada.scholarId,
      assignedCount: 2,
      completedCount: 1,
      overdueCount: 0,
      completionRate: 50,
    });
    expect(report.scholars[1]).toMatchObject({
      scholarId: ben.scholarId,
      assignedCount: 1,
      completedCount: 1,
      completionRate: 100,
    });
    expect(report.filterOptions.phases).toEqual(
      expect.arrayContaining(['english', 'English', 'proposal'])
    );
    expect(report.filterOptions.phases).toHaveLength(3);
  });

  it('filters rows by scholarId without dropping filter options', () => {
    const report = buildPrepYearReport(
      [ada, ben],
      [ielts],
      [],
      [coursera],
      [],
      [englishTask(ben.scholarId, 'pending', '2026-10-01T00:00:00.000Z')],
      { scholarId: ben.scholarId },
      now
    );

    expect(report.scholars).toHaveLength(1);
    expect(report.scholars[0]?.scholarId).toBe(ben.scholarId);
    expect(report.summary.scholarCount).toBe(1);
    expect(report.filterOptions.scholars).toHaveLength(2);
  });

  it('does not treat completed tasks as overdue', () => {
    const report = buildPrepYearReport(
      [ada],
      [],
      [],
      [],
      [],
      [englishTask(ada.scholarId, 'completed', '2020-01-01T00:00:00.000Z')],
      {},
      now
    );
    expect(report.scholars[0]).toMatchObject({
      assignedCount: 1,
      completedCount: 1,
      overdueCount: 0,
      completionRate: 100,
    });
  });
});

describe('prepYearReportToCsv', () => {
  it('writes dynamic doc and platform columns and leaves unassigned rates blank', () => {
    const report = buildPrepYearReport(
      [ada, ben],
      [ielts],
      [{ scholarId: ada.scholarId, typeId: ielts.id }],
      [coursera],
      [{ scholarId: ada.scholarId, platformId: coursera.id, status: 'yes' }],
      [
        englishTask(ada.scholarId, 'completed', '2026-10-01T00:00:00.000Z'),
        englishTask(ada.scholarId, 'pending', '2026-10-01T00:00:00.000Z'),
      ],
      {},
      now
    );

    const csv = prepYearReportToCsv(report);
    const [header, adaRow, benRow] = csv.split('\n');

    expect(header).toContain('"IELTS results"');
    expect(header).toContain('"Coursera"');
    expect(header).not.toContain('Volunteer');
    expect(header).not.toContain('Application');
    expect(header).not.toContain('Current phase');
    expect(adaRow).toContain('"50%"');
    expect(adaRow).toContain('"submitted"');
    expect(adaRow).toContain('"yes"');
    expect(adaRow).toContain('"Oxford"');
    expect(benRow).toContain('"0","0","0","",');
    expect(benRow).toContain('"missing"');
    expect(benRow).toContain('"pending"');
    expect(benRow).not.toContain('%');
  });

  it('neutralizes formula-like names', () => {
    const report = buildPrepYearReport(
      [
        {
          ...ada,
          name: '=CMD',
        },
      ],
      [],
      [],
      [],
      [],
      [],
      {},
      now
    );
    expect(prepYearReportToCsv(report)).toContain(`"'=CMD"`);
  });
});
