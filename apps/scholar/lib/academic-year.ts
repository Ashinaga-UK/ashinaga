const LONDON_TIME_ZONE = 'Europe/London';
export const FILABLE_ACADEMIC_YEAR_COUNT = 4;

export function getLondonDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

export function formatCanonicalAcademicYear(startYear: number) {
  return `${startYear}/${startYear + 1}`;
}

export function isValidAcademicYear(value: string): boolean {
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!match) {
    return false;
  }

  const startYear = Number(match[1]);
  const endPart = match[2];
  const expectedEndYear = startYear + 1;

  if (endPart.length === 4) {
    return Number(endPart) === expectedEndYear;
  }

  return Number(endPart) === expectedEndYear % 100;
}

export function toCanonicalAcademicYear(value: string) {
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!match || !isValidAcademicYear(value)) {
    return value;
  }

  const startYear = Number(match[1]);
  return `${startYear}/${startYear + 1}`;
}

export function getDefaultAcademicYear(now = new Date()) {
  const { year, month } = getLondonDateParts(now);
  const endYear = month >= 9 ? year : year - 1;
  return formatCanonicalAcademicYear(endYear - 1);
}

export function getFilableAcademicYears(now = new Date()): [string, ...string[]] {
  const defaultYear = getDefaultAcademicYear(now);
  const startYear = Number(defaultYear.slice(0, 4));
  const olderYears = Array.from({ length: FILABLE_ACADEMIC_YEAR_COUNT - 1 }, (_, index) =>
    formatCanonicalAcademicYear(startYear - index - 1)
  );

  return [defaultYear, ...olderYears];
}
