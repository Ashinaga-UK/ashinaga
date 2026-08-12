import { database } from '../../db/connection';
import { scholars } from '../../db/schema';

function formatFilterOptions(rows: Array<{ value: string | null }>) {
  return rows
    .map((row) => row.value)
    .filter((value): value is string => Boolean(value))
    .sort();
}

export async function getScholarAudienceFilterOptions() {
  const [programRows, yearRows, universityRows, locationRows, statusRows] = await Promise.all([
    database.selectDistinct({ value: scholars.program }).from(scholars),
    database.selectDistinct({ value: scholars.year }).from(scholars),
    database.selectDistinct({ value: scholars.university }).from(scholars),
    database.selectDistinct({ value: scholars.location }).from(scholars),
    database.selectDistinct({ value: scholars.status }).from(scholars),
  ]);

  return {
    programs: formatFilterOptions(programRows),
    years: formatFilterOptions(yearRows),
    universities: formatFilterOptions(universityRows),
    locations: formatFilterOptions(locationRows),
    statuses: formatFilterOptions(statusRows),
  };
}
