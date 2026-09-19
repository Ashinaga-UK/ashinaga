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

export function toCanonicalAcademicYear(value: string) {
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!match) {
    return value;
  }

  const startYear = Number(match[1]);
  const endPart = match[2];
  const endYear = endPart.length === 4 ? Number(endPart) : startYear + 1;
  return `${startYear}/${endYear}`;
}

export function getDefaultAcademicYear(now = new Date()) {
  const { year, month } = getLondonDateParts(now);
  const endYear = month >= 9 ? year : year - 1;
  return formatCanonicalAcademicYear(endYear - 1);
}

export function getFilableAcademicYears(now = new Date()) {
  const defaultYear = getDefaultAcademicYear(now);
  const startYear = Number(defaultYear.slice(0, 4));

  return Array.from({ length: FILABLE_ACADEMIC_YEAR_COUNT }, (_, index) =>
    formatCanonicalAcademicYear(startYear - index)
  );
}
