import type { Gender } from './constants';

export const SCHOLAR_IMPORT_COLUMNS = [
  'name',
  'email',
  'program',
  'university',
  'year',
  'startDate',
  'programStage',
] as const;

export type ScholarImportColumn = (typeof SCHOLAR_IMPORT_COLUMNS)[number];

export type ScholarImportRow = {
  name: string;
  email: string;
  program: string;
  university: string;
  year: string;
  startDate: string;
  programStage: 'prep_year' | 'scholar';
  aaiScholarId: string;
  dateOfBirth: string;
  gender: Gender | '';
  nationality: string;
  phone: string;
  passportExpirationDate: string;
  visaExpirationDate: string;
  location: string;
  addressHomeCountry: string;
  emergencyContactCountryOfStudy: string;
  emergencyContactHomeCountry: string;
  universityId: string;
  dietaryInformation: string;
  kokorozashi: string;
  longTermCareerPlan: string;
  postGraduationPlan: string;
  graduationDate: string;
  bio: string;
  majorCategory: string;
  fieldOfStudy: string;
  intendedUniversity: string;
  intendedCourse: string;
  degreePathway: string;
};

export const SCHOLAR_IMPORT_TEMPLATE_FILENAME = 'scholar-import-template.csv';

const EXAMPLE_ROWS: Array<Record<ScholarImportColumn, string>> = [
  {
    name: 'Ada Scholar',
    email: 'ada.scholar@example.com',
    program: 'Computer Science',
    university: 'University of Oxford',
    year: 'Year 1',
    startDate: '2026-09-01',
    programStage: 'scholar',
  },
  {
    name: 'Ben Candidate',
    email: 'ben.candidate@example.com',
    program: 'Medicine',
    university: 'University of Edinburgh',
    year: 'Foundation',
    startDate: '2026-09-01',
    programStage: 'prep_year',
  },
];

export function buildScholarImportTemplateCsv(): string {
  const header = SCHOLAR_IMPORT_COLUMNS.join(',');
  const rows = EXAMPLE_ROWS.map((row) =>
    SCHOLAR_IMPORT_COLUMNS.map((column) => escapeCsvCell(row[column])).join(',')
  );
  return [header, ...rows].join('\n');
}

export function parseScholarImportCsv(text: string): {
  rows: ScholarImportRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const table = parseCsv(text);
  const headerRow = table[0];
  if (!headerRow || headerRow.every((cell) => cell.trim() === '')) {
    return {
      rows: [],
      errors: ['The file is empty. Download the template and add at least one row.'],
    };
  }

  const headerIndex = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    headerIndex.set(normalizeHeader(cell), index);
  });

  const missingRequired = (['name', 'email'] as const).filter((column) => !headerIndex.has(column));
  if (missingRequired.length > 0) {
    return {
      rows: [],
      errors: [`The file is missing required columns: ${missingRequired.join(', ')}.`],
    };
  }

  const rows: ScholarImportRow[] = [];
  table.slice(1).forEach((cells, index) => {
    if (cells.every((cell) => cell.trim() === '')) return;
    const line = index + 2;
    const value = (column: string) => cells[headerIndex.get(column) ?? -1]?.trim() ?? '';
    const name = value('name');
    const email = value('email');
    if (!name || !email) {
      errors.push(`Row ${line}: name and email are required.`);
      return;
    }
    if (!email.includes('@')) {
      errors.push(`Row ${line}: "${email}" is not a valid email.`);
      return;
    }

    rows.push({
      name,
      email,
      program: value('program'),
      university: value('university'),
      year: value('year'),
      startDate: value('startdate'),
      programStage: normalizeProgramStage(value('programstage')),
      aaiScholarId: value('aaischolarid'),
      dateOfBirth: value('dateofbirth'),
      gender: normalizeGender(value('gender')),
      nationality: value('nationality'),
      phone: value('phone'),
      passportExpirationDate: value('passportexpirationdate'),
      visaExpirationDate: value('visaexpirationdate'),
      location: value('location'),
      addressHomeCountry: value('addresshomecountry'),
      emergencyContactCountryOfStudy: value('emergencycontactcountryofstudy'),
      emergencyContactHomeCountry: value('emergencycontacthomecountry'),
      universityId: value('universityid'),
      dietaryInformation: value('dietaryinformation'),
      kokorozashi: value('kokorozashi'),
      longTermCareerPlan: value('longtermcareerplan'),
      postGraduationPlan: value('postgraduationplan'),
      graduationDate: value('graduationdate'),
      bio: value('bio'),
      majorCategory: value('majorcategory'),
      fieldOfStudy: value('fieldofstudy'),
      intendedUniversity: value('intendeduniversity'),
      intendedCourse: value('intendedcourse'),
      degreePathway: value('degreepathway'),
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No scholar rows found. Keep the header row and add people below it.');
  }

  return { rows, errors };
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function normalizeProgramStage(value: string): 'prep_year' | 'scholar' {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'prep_year' || normalized === 'prepyear' || normalized === 'candidate') {
    return 'prep_year';
  }
  return 'scholar';
}

function normalizeGender(value: string): Gender | '' {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (
    normalized === 'male' ||
    normalized === 'female' ||
    normalized === 'other' ||
    normalized === 'prefer_not_to_say'
  ) {
    return normalized;
  }
  return '';
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }
    if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }
    if (char !== '\r') {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}
