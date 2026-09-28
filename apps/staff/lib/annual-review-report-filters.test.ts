import {
  type AnnualReviewReportFilterState,
  filterAnnualReviewReportRows,
  getAnnualReviewReportFilterOptions,
} from './annual-review-report-filters';
import type { AnnualUpdateReportRow } from './api-client';

const allFilters: AnnualReviewReportFilterState = {
  searchTerm: '',
  academicYear: 'all',
  status: 'all',
  classification: 'all',
  weightedGrade: 'all',
  leadershipCount: 'all',
  payItForwardCount: 'all',
  subSaharanAfricaCount: 'all',
  internship: 'all',
  program: 'all',
  scholarYear: 'all',
};

function review(overrides: Partial<AnnualUpdateReportRow> = {}): AnnualUpdateReportRow {
  return {
    id: 'review-1',
    scholarId: 'scholar-1',
    academicYear: '2025/2026',
    status: 'submitted',
    submittedAt: '2026-07-21T12:00:00.000Z',
    updatedAt: '2026-07-21T12:00:00.000Z',
    scholarName: 'Ada Scholar',
    scholarEmail: 'ada@example.com',
    aaiScholarId: 'AAI-1',
    scholarYear: 'Year 1',
    university: 'Test University',
    program: 'Law',
    academicYearAverageClassification: '1st',
    academicYearWeightedGrade: '70%',
    leadershipRolesCount: 1,
    payItForwardCount: 1,
    subSaharanAfricaActivitiesCount: 1,
    independentInternshipsCount: 0,
    completedAshinagaAfricaInternship: false,
    hasInternshipSummary: false,
    ...overrides,
  };
}

describe('filterAnnualReviewReportRows', () => {
  const rows = [
    review(),
    review({
      id: 'review-2',
      scholarId: 'scholar-2',
      scholarName: 'Bea Scholar',
      scholarEmail: 'bea@example.com',
      academicYearAverageClassification: '2:1',
    }),
    review({
      id: 'review-3',
      scholarId: 'scholar-3',
      scholarName: 'Cam Scholar',
      scholarEmail: 'cam@example.com',
      academicYear: '2024/2025',
      status: 'draft',
      program: 'Medicine',
      scholarYear: 'Year 2',
      academicYearAverageClassification: '1st',
      leadershipRolesCount: 3,
    }),
  ];

  it('keeps search, academic year, and status and AND-s a new filter', () => {
    const filtered = filterAnnualReviewReportRows(rows, {
      ...allFilters,
      searchTerm: 'ada',
      academicYear: '2025/2026',
      status: 'submitted',
      classification: '1st',
    });

    expect(filtered.map((row) => row.id)).toEqual(['review-1']);
  });

  it('returns the input set when every new filter is all', () => {
    expect(filterAnnualReviewReportRows(rows, allFilters)).toEqual(rows);
  });

  it('matches a trimmed classification and leaves a different case unmatched', () => {
    const classificationRows = [
      review({ id: 'exact', academicYearAverageClassification: '1st' }),
      review({ id: 'padded', academicYearAverageClassification: '1st ' }),
      review({ id: 'case', academicYearAverageClassification: '1ST' }),
    ];

    expect(
      filterAnnualReviewReportRows(classificationRows, {
        ...allFilters,
        classification: '1st',
      }).map((row) => row.id)
    ).toEqual(['exact', 'padded']);
  });

  it('matches a submitted zero count and ignores null', () => {
    const countRows = [
      review({ id: 'zero', leadershipRolesCount: 0 }),
      review({ id: 'missing', leadershipRolesCount: null }),
      review({ id: 'draft-zero', status: 'draft', leadershipRolesCount: 0 }),
    ];

    expect(
      filterAnnualReviewReportRows(countRows, {
        ...allFilters,
        leadershipCount: '0',
      }).map((row) => row.id)
    ).toEqual(['zero']);
  });

  it('matches each internship option only by its own rule', () => {
    const internshipRows = [
      review({
        id: 'completed',
        completedAshinagaAfricaInternship: true,
        independentInternshipsCount: 0,
        hasInternshipSummary: false,
      }),
      review({
        id: 'not-completed',
        completedAshinagaAfricaInternship: false,
        independentInternshipsCount: 0,
        hasInternshipSummary: false,
      }),
      review({
        id: 'unanswered',
        completedAshinagaAfricaInternship: null,
        independentInternshipsCount: 0,
        hasInternshipSummary: false,
      }),
      review({
        id: 'independent',
        completedAshinagaAfricaInternship: null,
        independentInternshipsCount: 2,
        hasInternshipSummary: false,
      }),
      review({
        id: 'described',
        completedAshinagaAfricaInternship: null,
        independentInternshipsCount: 0,
        hasInternshipSummary: true,
      }),
    ];

    expect(matchingIds(internshipRows, { internship: 'ashinaga_completed' })).toEqual([
      'completed',
    ]);
    expect(matchingIds(internshipRows, { internship: 'ashinaga_not_completed' })).toEqual([
      'not-completed',
    ]);
    expect(matchingIds(internshipRows, { internship: 'independent' })).toEqual(['independent']);
    expect(matchingIds(internshipRows, { internship: 'described' })).toEqual(['described']);
  });

  it('matches programme and scholar year on a draft', () => {
    expect(
      filterAnnualReviewReportRows(rows, {
        ...allFilters,
        program: 'Medicine',
        scholarYear: 'Year 2',
      }).map((row) => row.id)
    ).toEqual(['review-3']);
  });

  it('does not match a draft that still carries a leadership count', () => {
    expect(
      filterAnnualReviewReportRows(rows, {
        ...allFilters,
        leadershipCount: '3',
      }).map((row) => row.id)
    ).toEqual([]);
  });
});

describe('getAnnualReviewReportFilterOptions', () => {
  const rows = [
    review({
      id: 'submitted-padded',
      academicYearAverageClassification: '1st ',
      academicYearWeightedGrade: '70%',
      leadershipRolesCount: 10,
      payItForwardCount: 0,
      subSaharanAfricaActivitiesCount: 2,
      program: 'Law',
      scholarYear: 'Year 1',
    }),
    review({
      id: 'submitted-other',
      academicYearAverageClassification: 'First Class',
      academicYearWeightedGrade: '64%',
      leadershipRolesCount: 0,
      payItForwardCount: 2,
      subSaharanAfricaActivitiesCount: null,
      program: 'Law',
      scholarYear: 'Year 1',
    }),
    review({
      id: 'submitted-blank',
      academicYearAverageClassification: '   ',
      academicYearWeightedGrade: '',
      leadershipRolesCount: null,
      payItForwardCount: null,
      subSaharanAfricaActivitiesCount: null,
      program: '',
      scholarYear: '   ',
    }),
    review({
      id: 'draft',
      status: 'draft',
      academicYearAverageClassification: 'Secret',
      academicYearWeightedGrade: '99%',
      leadershipRolesCount: 9,
      payItForwardCount: 9,
      subSaharanAfricaActivitiesCount: 9,
      program: 'Medicine',
      scholarYear: 'Year 2',
    }),
  ];

  it('ignores draft answers and does not shrink when another filter is active', () => {
    const filtered = filterAnnualReviewReportRows(rows, { ...allFilters, program: 'Law' });
    const options = getAnnualReviewReportFilterOptions(rows);

    expect(filtered.map((row) => row.id)).not.toContain('draft');
    expect(options.classifications).toEqual(['1st', 'First Class']);
    expect(options.weightedGrades).toEqual(['64%', '70%']);
    expect(options.leadershipCounts).toEqual(['0', '10']);
    expect(options.payItForwardCounts).toEqual(['0', '2']);
    expect(options.subSaharanAfricaCounts).toEqual(['2']);
    expect(options.programs).toEqual(['Law', 'Medicine']);
    expect(options.scholarYears).toEqual(['Year 1', 'Year 2']);
  });
});

function matchingIds(
  rows: AnnualUpdateReportRow[],
  filters: Partial<AnnualReviewReportFilterState>
) {
  return filterAnnualReviewReportRows(rows, { ...allFilters, ...filters }).map((row) => row.id);
}
