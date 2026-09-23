import { DEFAULT_ANNUAL_REVIEW_COPY, mergeAnnualReviewCopy } from './annual-review-copy';

describe('mergeAnnualReviewCopy', () => {
  it('keeps the in-code wording when a stored string is blank', () => {
    expect(
      mergeAnnualReviewCopy({
        'sections.yearOverview.title': '   ',
        'questions.highlights.prompt': 'What stood out this year?',
      })
    ).toMatchObject({
      'sections.yearOverview.title': DEFAULT_ANNUAL_REVIEW_COPY['sections.yearOverview.title'],
      'questions.highlights.prompt': 'What stood out this year?',
    });
  });
});
