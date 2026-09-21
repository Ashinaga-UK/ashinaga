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
