import {
  ACADEMIC_YEAR_PATTERN,
  academicYearLookupValues,
  isValidAcademicYear,
  toCanonicalAcademicYear,
} from './academic-year';

describe('ACADEMIC_YEAR_PATTERN', () => {
  it.each(['2025/2026', '2025/26', '2025/27'])('accepts format %s', (value) => {
    expect(ACADEMIC_YEAR_PATTERN.test(value)).toBe(true);
  });

  it.each(['2025', '25/26', '2025-26', '2025/202'])('rejects %s', (value) => {
    expect(ACADEMIC_YEAR_PATTERN.test(value)).toBe(false);
  });
});

describe('isValidAcademicYear', () => {
  it.each(['2025/2026', '2025/26'])('accepts consecutive teaching year %s', (value) => {
    expect(isValidAcademicYear(value)).toBe(true);
  });

  it.each(['2025/2027', '2025/27', '2025/25', '2025'])('rejects non-consecutive or invalid %s', (value) => {
    expect(isValidAcademicYear(value)).toBe(false);
  });
});

describe('toCanonicalAcademicYear', () => {
  it('expands YYYY/YY into YYYY/YYYY', () => {
    expect(toCanonicalAcademicYear('2025/26')).toBe('2025/2026');
  });

  it('keeps YYYY/YYYY', () => {
    expect(toCanonicalAcademicYear('2025/2026')).toBe('2025/2026');
  });

  it('does not rewrite non-consecutive years', () => {
    expect(toCanonicalAcademicYear('2025/27')).toBe('2025/27');
    expect(toCanonicalAcademicYear('2025/2028')).toBe('2025/2028');
  });
});

describe('academicYearLookupValues', () => {
  it('looks up both spellings of a teaching year', () => {
    expect(academicYearLookupValues('2025/2026')).toEqual(['2025/2026', '2025/26']);
    expect(academicYearLookupValues('2025/26')).toEqual(['2025/2026', '2025/26']);
  });
});
