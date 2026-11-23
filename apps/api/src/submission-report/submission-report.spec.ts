import { buildSubmissionReport, submissionReportToCsv } from './submission-report';

describe('buildSubmissionReport', () => {
  const rows = [
    { month: '2026-01', type: 'others' as const, program: 'Law', year: '2026', count: 2 },
    {
      month: '2026-01',
      type: 'extenuating_circumstances' as const,
      program: 'Law',
      year: '2026',
      count: 1,
    },
    { month: '2025-12', type: 'others' as const, program: 'Medicine', year: '2025', count: 4 },
  ];

  it('totals by month, type and cohort', () => {
    const report = buildSubmissionReport(rows);
    expect(report.summary).toEqual({
      total: 7,
      byType: { others: 6, extenuating_circumstances: 1 },
    });
    expect(report.months).toEqual([
      { month: '2025-12', total: 4, byType: { others: 4 } },
      { month: '2026-01', total: 3, byType: { others: 2, extenuating_circumstances: 1 } },
    ]);
    expect(report.cohorts).toEqual([
      {
        program: 'Law',
        year: '2026',
        total: 3,
        byType: { others: 2, extenuating_circumstances: 1 },
      },
      { program: 'Medicine', year: '2025', total: 4, byType: { others: 4 } },
    ]);
  });

  it('returns zeros for no rows', () => {
    expect(buildSubmissionReport([]).summary).toEqual({ total: 0, byType: {} });
  });

  it('writes one escaped CSV line per row', () => {
    const csv = submissionReportToCsv(
      buildSubmissionReport([
        { month: '2026-01', type: 'others', program: '=Law', year: '2026', count: 2 },
      ])
    );
    expect(csv.split('\n')).toEqual([
      '"Month","Request type","Program","Year","Submissions"',
      `"2026-01","others","'=Law","2026","2"`,
    ]);
  });
});
