import {
  FILABLE_ACADEMIC_YEAR_COUNT,
  getDefaultAcademicYear,
  getFilableAcademicYears,
  toCanonicalAcademicYear,
} from './academic-year';

describe('getDefaultAcademicYear', () => {
  it.each([
    ['2026-09-18T12:00:00.000Z', '2025/2026'],
    ['2026-09-21T12:00:00.000Z', '2025/2026'],
    ['2027-01-01T12:00:00.000Z', '2025/2026'],
    ['2027-09-18T12:00:00.000Z', '2026/2027'],
  ])('defaults to the completed teaching year at %s', (isoDate, expected) => {
    expect(getDefaultAcademicYear(new Date(isoDate))).toBe(expected);
  });

  it('rolls over on 1 September in Europe/London, not 1 January', () => {
    expect(getDefaultAcademicYear(new Date('2026-08-31T12:00:00.000Z'))).toBe('2024/2025');
    expect(getDefaultAcademicYear(new Date('2026-09-01T00:30:00.000Z'))).toBe('2025/2026');
  });
});

describe('getFilableAcademicYears', () => {
  it('offers completed years only, newest first', () => {
    expect(getFilableAcademicYears(new Date('2026-09-18T12:00:00.000Z'))).toEqual([
      '2025/2026',
      '2024/2025',
      '2023/2024',
      '2022/2023',
    ]);
  });

  it('does not offer the incoming teaching year', () => {
    const years = getFilableAcademicYears(new Date('2026-09-21T12:00:00.000Z'));

    expect(years).toHaveLength(FILABLE_ACADEMIC_YEAR_COUNT);
    expect(years).not.toContain('2026/2027');
  });
});

describe('toCanonicalAcademicYear', () => {
  it('expands a legacy YYYY/YY label', () => {
    expect(toCanonicalAcademicYear('2025/26')).toBe('2025/2026');
  });

  it('keeps a canonical YYYY/YYYY label', () => {
    expect(toCanonicalAcademicYear('2025/2026')).toBe('2025/2026');
  });

  it('does not rewrite non-consecutive years', () => {
    expect(toCanonicalAcademicYear('2025/27')).toBe('2025/27');
    expect(toCanonicalAcademicYear('2025/2028')).toBe('2025/2028');
  });
});
