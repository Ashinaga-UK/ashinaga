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
    const matchesProgram = filters.program === 'all' || row.program === filters.program;
    const matchesScholarYear =
      filters.scholarYear === 'all' || row.scholarYear === filters.scholarYear;

    return (
      matchesSearch &&
      matchesAcademicYear &&
      matchesStatus &&
      matchesProgram &&
      matchesScholarYear &&
      matchesClassification(row, filters.classification) &&
      matchesWeightedGrade(row, filters.weightedGrade) &&
      matchesCount(row, filters.leadershipCount, 'leadershipRolesCount') &&
      matchesCount(row, filters.payItForwardCount, 'payItForwardCount') &&
      matchesCount(row, filters.subSaharanAfricaCount, 'subSaharanAfricaActivitiesCount') &&
      matchesInternship(row, filters.internship)
    );
  });
}

export function getAnnualReviewReportFilterOptions(
  rows: AnnualUpdateReportRow[]
): AnnualReviewReportFilterOptions {
  const submitted = rows.filter((row) => row.status === 'submitted');

  return {
    academicYears: [...new Set(rows.map((row) => row.academicYear))].sort().reverse(),
    classifications: uniqueSortedText(
      submitted.map((row) => row.academicYearAverageClassification?.trim() ?? '')
    ),
    weightedGrades: uniqueSortedText(
      submitted.map((row) => row.academicYearWeightedGrade?.trim() ?? '')
    ),
    leadershipCounts: uniqueSortedCounts(submitted.map((row) => row.leadershipRolesCount)),
    payItForwardCounts: uniqueSortedCounts(submitted.map((row) => row.payItForwardCount)),
    subSaharanAfricaCounts: uniqueSortedCounts(
      submitted.map((row) => row.subSaharanAfricaActivitiesCount)
    ),
    programs: uniqueSortedText(rows.map((row) => row.program)),
    scholarYears: uniqueSortedText(rows.map((row) => row.scholarYear)),
  };
}

function matchesClassification(row: AnnualUpdateReportRow, classification: string) {
  if (classification === 'all') {
    return true;
  }

  return (
    row.status === 'submitted' &&
    (row.academicYearAverageClassification ?? '').trim() === classification
  );
}

function matchesWeightedGrade(row: AnnualUpdateReportRow, weightedGrade: string) {
  if (weightedGrade === 'all') {
    return true;
  }

  return (
    row.status === 'submitted' && (row.academicYearWeightedGrade ?? '').trim() === weightedGrade
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
      return row.completedAshinagaAfricaInternship === false;
    case 'independent':
      return row.independentInternshipsCount !== null && row.independentInternshipsCount >= 1;
    case 'described':
      return row.hasInternshipSummary === true;
    default:
      return false;
  }
}

function uniqueSortedText(values: string[]) {
  return [...new Set(values.filter((value) => value.trim() !== ''))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function uniqueSortedCounts(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => value !== null))]
    .sort((left, right) => left - right)
    .map(String);
}
