import type { requestTypeEnum } from '../db/schema';
import { escapeCsvValue } from '../utils/csv';

export type SubmissionRequestType = (typeof requestTypeEnum.enumValues)[number];

/** One SQL group: UTC month × request type × folded cohort. */
export type SubmissionReportRow = {
  month: string;
  type: SubmissionRequestType;
  program: string;
  year: string;
  count: number;
};

export type SubmissionTypeCounts = Partial<Record<SubmissionRequestType, number>>;

export type SubmissionReport = {
  summary: { total: number; byType: SubmissionTypeCounts };
  months: Array<{ month: string; total: number; byType: SubmissionTypeCounts }>;
  cohorts: Array<{ program: string; year: string; total: number; byType: SubmissionTypeCounts }>;
  rows: SubmissionReportRow[];
};

function addTo(counts: SubmissionTypeCounts, type: SubmissionRequestType, count: number) {
  counts[type] = (counts[type] ?? 0) + count;
}

export function buildSubmissionReport(rows: SubmissionReportRow[]): SubmissionReport {
  const summary = { total: 0, byType: {} as SubmissionTypeCounts };
  const months = new Map<string, SubmissionReport['months'][number]>();
  const cohorts = new Map<string, SubmissionReport['cohorts'][number]>();

  for (const row of rows) {
    summary.total += row.count;
    addTo(summary.byType, row.type, row.count);

    const month = months.get(row.month) ?? { month: row.month, total: 0, byType: {} };
    month.total += row.count;
    addTo(month.byType, row.type, row.count);
    months.set(row.month, month);

    const key = `${row.program.toLocaleLowerCase('en-GB')}\0${row.year.toLocaleLowerCase('en-GB')}`;
    const cohort = cohorts.get(key) ?? {
      program: row.program,
      year: row.year,
      total: 0,
      byType: {},
    };
    cohort.total += row.count;
    addTo(cohort.byType, row.type, row.count);
    cohorts.set(key, cohort);
  }

  return {
    summary,
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    cohorts: [...cohorts.values()].sort(
      (a, b) =>
        a.program.localeCompare(b.program, 'en-GB', { sensitivity: 'base' }) ||
        a.year.localeCompare(b.year, 'en-GB', { sensitivity: 'base' })
    ),
    rows,
  };
}

export function submissionReportToCsv(report: SubmissionReport): string {
  const headers = ['Month', 'Request type', 'Program', 'Year', 'Submissions'];
  const rows = report.rows.map((row) => [row.month, row.type, row.program, row.year, row.count]);
  return [headers, ...rows]
    .map((cells) => cells.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');
}
