function parseAcademicYear(value: string) {
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(value.trim());
  const startYearPart = match?.[1];
  const endPart = match?.[2];
  if (!startYearPart || !endPart) {
    return null;
  }

  return { startYear: Number(startYearPart), endPart };
}

export function isValidAcademicYear(value: string): boolean {
  const parsed = parseAcademicYear(value);
  if (!parsed) {
    return false;
  }

  const expectedEndYear = parsed.startYear + 1;
  if (parsed.endPart.length === 4) {
    return Number(parsed.endPart) === expectedEndYear;
  }

  return Number(parsed.endPart) === expectedEndYear % 100;
}

export function toCanonicalAcademicYear(value: string) {
  const parsed = parseAcademicYear(value);
  if (!parsed || !isValidAcademicYear(value)) {
    return value;
  }

  return `${parsed.startYear}/${parsed.startYear + 1}`;
}
