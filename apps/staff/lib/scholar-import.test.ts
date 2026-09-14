import { buildScholarImportTemplateCsv, parseScholarImportCsv } from './scholar-import';

describe('scholar import template', () => {
  it('parses the downloadable template into scholar rows', () => {
    const parsed = parseScholarImportCsv(buildScholarImportTemplateCsv());

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        name: 'Ada Scholar',
        email: 'ada.scholar@example.com',
        program: 'Computer Science',
        university: 'University of Oxford',
        year: 'Year 1',
        programStage: 'scholar',
      }),
      expect.objectContaining({
        name: 'Ben Candidate',
        email: 'ben.candidate@example.com',
        programStage: 'prep_year',
      }),
    ]);
  });

  it('keeps quoted commas and reports missing emails', () => {
    const csv = [
      'name,email,program,university,year',
      '"Okoro, Ada",ada@example.com,Law,Oxford,Year 1',
      'No Email,,Medicine,Edinburgh,Year 2',
    ].join('\n');

    const parsed = parseScholarImportCsv(csv);

    expect(parsed.rows).toEqual([
      expect.objectContaining({ name: 'Okoro, Ada', email: 'ada@example.com' }),
    ]);
    expect(parsed.errors).toEqual(['Row 3: name and email are required.']);
  });
});
