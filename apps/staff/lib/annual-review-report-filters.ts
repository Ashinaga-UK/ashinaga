import type { AnnualUpdateReportRow } from './api-client';

export type AnnualReviewInternshipFilter =
  | 'all'
  | 'ashinaga_completed'
  | 'ashinaga_not_completed'
  | 'independent'
  | 'described';

export interface AnnualReviewReportFilterState {
  searchTerm: string;
  academicYear: string;
  status: 'all' | 'draft' | 'submitted';
  classification: string;
  weightedGrade: string;
  leadershipCount: string;
  payItForwardCount: string;
  subSaharanAfricaCount: string;
  internship: AnnualReviewInternshipFilter;
  program: string;
  scholarYear: string;
}

export interface AnnualReviewReportFilterOptions {
  academicYears: string[];
  classifications: string[];
  weightedGrades: string[];
  leadershipCounts: string[];
  payItForwardCounts: string[];
  subSaharanAfricaCounts: string[];
  programs: string[];
  scholarYears: string[];
}

export function filterAnnualReviewReportRows(
  rows: AnnualUpdateReportRow[],
  filters: AnnualReviewReportFilterState
): AnnualUpdateReportRow[] {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      row.scholarName.toLowerCase().includes(normalizedSearch) ||
      row.scholarEmail.toLowerCase().includes(normalizedSearch) ||
      (row.aaiScholarId ?? '').toLowerCase().includes(normalizedSearch) ||
      row.university.toLowerCase().includes(normalizedSearch);
    const matchesAcademicYear =
      filters.academicYear === 'all' || row.academicYear === filters.academicYear;
    const matchesStatus = filters.status === 'all' || row.status === filters.status;
    const matchesProgram =
      filters.program === 'all' || normalizeStoredLabel(row.program) === filters.program;
    const matchesScholarYear =
      filters.scholarYear === 'all' ||
      normalizeStoredLabel(row.scholarYear) === filters.scholarYear;
    const applyAnswerFilters = filters.status !== 'draft';

    return (
      matchesSearch &&
      matchesAcademicYear &&
      matchesStatus &&
      matchesProgram &&
      matchesScholarYear &&
      (!applyAnswerFilters ||
        (matchesClassification(row, filters.classification) &&
          matchesWeightedGrade(row, filters.weightedGrade) &&
          matchesCount(row, filters.leadershipCount, 'leadershipRolesCount') &&
          matchesCount(row, filters.payItForwardCount, 'payItForwardCount') &&
          matchesCount(row, filters.subSaharanAfricaCount, 'subSaharanAfricaActivitiesCount') &&
          matchesInternship(row, filters.internship)))
    );
  });
}

export function getAnnualReviewReportFilterOptions(
  rows: AnnualUpdateReportRow[]
): AnnualReviewReportFilterOptions {
  const submitted = rows.filter((row) => row.status === 'submitted');

  return {
    academicYears: [...new Set(rows.map((row) => row.academicYear))].sort().reverse(),
    classifications: uniqueNormalized(
      submitted.map((row) => row.academicYearAverageClassification),
      normalizeFreeTextAnswer,
      (left, right) => left.localeCompare(right)
    ),
    weightedGrades: uniqueNormalized(
      submitted.map((row) => row.academicYearWeightedGrade),
      normalizeFreeTextAnswer,
      compareWeightedGrades
    ),
    leadershipCounts: uniqueSortedCounts(submitted.map((row) => row.leadershipRolesCount)),
    payItForwardCounts: uniqueSortedCounts(submitted.map((row) => row.payItForwardCount)),
    subSaharanAfricaCounts: uniqueSortedCounts(
      submitted.map((row) => row.subSaharanAfricaActivitiesCount)
    ),
    programs: uniqueNormalized(
      rows.map((row) => row.program),
      normalizeStoredLabel,
      (left, right) => left.localeCompare(right)
    ),
    scholarYears: uniqueNormalized(
      rows.map((row) => row.scholarYear),
      normalizeStoredLabel,
      (left, right) => left.localeCompare(right)
    ),
  };
}

function matchesClassification(row: AnnualUpdateReportRow, classification: string) {
  if (classification === 'all') {
    return true;
  }

  return (
    row.status === 'submitted' &&
    normalizeFreeTextAnswer(row.academicYearAverageClassification) === classification
  );
}

function matchesWeightedGrade(row: AnnualUpdateReportRow, weightedGrade: string) {
  if (weightedGrade === 'all') {
    return true;
  }

  return (
    row.status === 'submitted' &&
    normalizeFreeTextAnswer(row.academicYearWeightedGrade) === weightedGrade
  );
}

function matchesCount(
  row: AnnualUpdateReportRow,
  selected: string,
  field: 'leadershipRolesCount' | 'payItForwardCount' | 'subSaharanAfricaActivitiesCount'
) {
  if (selected === 'all') {
    return true;
  }

  if (row.status !== 'submitted') {
    return false;
  }

  const count = row[field];
  return count !== null && String(count) === selected;
}

function matchesInternship(row: AnnualUpdateReportRow, internship: AnnualReviewInternshipFilter) {
  if (internship === 'all') {
    return true;
  }

  if (row.status !== 'submitted') {
    return false;
  }

  switch (internship) {
    case 'ashinaga_completed':
      return row.completedAshinagaAfricaInternship === true;
    case 'ashinaga_not_completed':
      return row.completedAshinagaAfricaInternship !== true;
    case 'independent':
      return row.independentInternshipsCount !== null && row.independentInternshipsCount >= 1;
    case 'described':
      return row.hasInternshipSummary === true;
    default:
      return false;
  }
}

function normalizeStoredLabel(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeFreeTextAnswer(value: string | null | undefined) {
  return normalizeStoredLabel(value).replace(/\s+%/g, '%').toLocaleLowerCase();
}

function uniqueNormalized(
  values: Array<string | null | undefined>,
  normalize: (value: string | null | undefined) => string,
  compare: (left: string, right: string) => number
) {
  return [...new Set(values.map(normalize).filter((value) => value !== ''))].sort(compare);
}

function compareWeightedGrades(left: string, right: string) {
  const leftNumber = leadingGradeNumber(left);
  const rightNumber = leadingGradeNumber(right);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function leadingGradeNumber(value: string) {
  const match = /^(\d+(?:\.\d+)?)%?$/.exec(value);
  return match?.[1] ? Number(match[1]) : null;
}

function uniqueSortedCounts(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => value !== null))]
    .sort((left, right) => left - right)
    .map(String);
}
