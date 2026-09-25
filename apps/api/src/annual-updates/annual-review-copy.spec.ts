import {
  DEFAULT_ANNUAL_REVIEW_COPY,
  mergeAnnualReviewCopy,
  validateAnnualReviewCopyStrings,
} from './annual-review-copy';

describe('annual review copy', () => {
  it('accepts and trims the complete supported copy map', () => {
    const strings = {
      ...DEFAULT_ANNUAL_REVIEW_COPY,
      'sections.yearOverview.title': '  Your year  ',
    };

    expect(validateAnnualReviewCopyStrings(strings)['sections.yearOverview.title']).toBe(
      'Your year'
    );
  });

  it('rejects unknown keys', () => {
    expect(() =>
      validateAnnualReviewCopyStrings({
        ...DEFAULT_ANNUAL_REVIEW_COPY,
        'questions.newQuestion.prompt': 'Not supported',
      })
    ).toThrow('Unknown: questions.newQuestion.prompt');
  });

  it('rejects missing keys and empty copy', () => {
    const missing = { ...DEFAULT_ANNUAL_REVIEW_COPY } as Record<string, string>;
    delete missing['questions.highlights.prompt'];

    expect(() => validateAnnualReviewCopyStrings(missing)).toThrow(
      'Missing: questions.highlights.prompt'
    );
    expect(() =>
      validateAnnualReviewCopyStrings({
        ...DEFAULT_ANNUAL_REVIEW_COPY,
        'questions.highlights.prompt': ' ',
      })
    ).toThrow('questions.highlights.prompt must be a non-empty string');
  });

  it('fills missing stored strings from the in-code defaults', () => {
    expect(
      mergeAnnualReviewCopy({
        'sections.yearOverview.title': 'Your year',
      })['questions.highlights.prompt']
    ).toBe(DEFAULT_ANNUAL_REVIEW_COPY['questions.highlights.prompt']);
  });
});
