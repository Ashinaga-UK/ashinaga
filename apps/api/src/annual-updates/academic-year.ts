export const ACADEMIC_YEAR_PATTERN = /^\d{4}\/(?:\d{4}|\d{2})$/;

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

export function academicYearLookupValues(value: string) {
  const canonical = toCanonicalAcademicYear(value);
  const match = /^(\d{4})\/(\d{4})$/.exec(canonical);
  if (!match) {
    return [value];
  }

  const legacy = `${match[1]}/${match[2].slice(-2)}`;
  return canonical === legacy ? [canonical] : [canonical, legacy];
}
