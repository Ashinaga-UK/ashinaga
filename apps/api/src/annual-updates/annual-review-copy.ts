export const DEFAULT_ANNUAL_REVIEW_COPY = {
  'helpers.numberHint': '(Enter a number)',
  'sections.yearOverview.title': 'Year Overview',
  'sections.yearOverview.description':
    'This review is for the academic year shown below. Share important moments you would like Ashinaga to know about.',
  'sections.workAndActivities.title': 'Work And Activities',
  'sections.workAndActivities.description':
    'Share employment, extracurriculars, personal projects, clubs, and other activities from the year.',
  'sections.leadershipAndImpact.title': 'Leadership and Impact',
  'sections.leadershipAndImpact.description':
    'Summarise your leadership roles and the ways you have passed kindness forward this year.',
  'sections.africaEngagementAndInternships.title': 'Africa Engagement And Internships',
  'sections.africaEngagementAndInternships.description':
    'Capture sub-Saharan Africa-related activities and internship experience.',
  'sections.academicResults.title': 'Academic Results',
  'sections.academicResults.description':
    'Record your classification and weighted grade for the academic year.',
  'questions.academicYear.prompt': 'Academic year',
  'questions.highlights.prompt':
    'Please describe any highlights; such as distinctions, awards, accomplishments, projects, or anything you are particularly proud of.',
  'questions.partTimeJobs.prompt':
    'Over the last year, have you had any part-time job(s)? Please briefly describe them.',
  'questions.extracurriculars.prompt':
    'Extracurriculars: What activities did you get involved in, such as hobbies, personal projects, clubs, etc.?',
  'questions.leadershipRolesCount.prompt': 'How many leadership roles have you held this year?',
  'questions.leadershipRolesDescription.prompt':
    'Leadership roles description: Describe the roles, organisations, events, etc.',
  'questions.payItForwardCount.prompt':
    'How many pay-it-forward activities have you taken part in this year? (Defined as passing on the kindness you have received, above and beyond everyday kindness, with no expectation of return.)',
  'questions.payItForwardDescription.prompt':
    'How have you paid it forward this year? Describe the activities.',
  'questions.subSaharanAfricaActivitiesCount.prompt':
    'How many sub-Saharan Africa-related activities this year?',
  'questions.subSaharanAfricaActivitiesDescription.prompt':
    'What activities connected to sub-Saharan Africa have you been involved in? Describe the role, organisation, event, etc.',
  'questions.independentInternshipsCount.prompt':
    'How many independently secured internships did you complete this year? Total number anywhere in the world.',
  'questions.internshipsInAfricaSummary.prompt':
    'Internships in Africa summary: Describe the positions, roles, etc.',
  'questions.internshipsElsewhereSummary.prompt':
    'Internships in UK, or elsewhere except Africa summary: Describe the positions, roles, etc.',
  'questions.completedAshinagaAfricaInternship.prompt':
    'Did you complete your Ashinaga 8-week internship in sub-Saharan Africa this year?',
  'questions.academicYearAverageClassification.prompt':
    'What was your academic year average? Please input according to classification, e.g. 1st, 2:1, 2:2, 3rd.',
  'questions.academicYearWeightedGrade.prompt':
    'What is your year average weighted grade for the academic year? For example, 70% / 64%.',
} as const;

export type AnnualReviewCopyKey = keyof typeof DEFAULT_ANNUAL_REVIEW_COPY;
export type AnnualReviewCopyStrings = Record<AnnualReviewCopyKey, string>;

const EXPECTED_KEYS = Object.keys(DEFAULT_ANNUAL_REVIEW_COPY) as AnnualReviewCopyKey[];

export function validateAnnualReviewCopyStrings(
  value: Record<string, unknown>
): AnnualReviewCopyStrings {
  const actualKeys = Object.keys(value);
  const unknownKeys = actualKeys.filter((key) => !Object.hasOwn(DEFAULT_ANNUAL_REVIEW_COPY, key));
  const missingKeys = EXPECTED_KEYS.filter((key) => !Object.hasOwn(value, key));

  if (unknownKeys.length > 0 || missingKeys.length > 0) {
    throw new Error(
      `Copy keys do not match the supported form copy. Unknown: ${unknownKeys.join(', ') || 'none'}. Missing: ${missingKeys.join(', ') || 'none'}.`
    );
  }

  const normalized = {} as AnnualReviewCopyStrings;
  for (const key of EXPECTED_KEYS) {
    const rawValue = value[key];
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
      throw new Error(`${key} must be a non-empty string.`);
    }

    const copy = rawValue.trim();
    const maxLength = key.endsWith('.title') || key === 'helpers.numberHint' ? 120 : 500;
    if (copy.length > maxLength) {
      throw new Error(`${key} must be ${maxLength} characters or fewer.`);
    }

    normalized[key] = copy;
  }

  return normalized;
}

export function mergeAnnualReviewCopy(
  value: Record<string, string> | null | undefined
): AnnualReviewCopyStrings {
  const merged = {} as AnnualReviewCopyStrings;
  for (const key of EXPECTED_KEYS) {
    const storedValue = value?.[key];
    merged[key] =
      typeof storedValue === 'string' && storedValue.trim() !== ''
        ? storedValue
        : DEFAULT_ANNUAL_REVIEW_COPY[key];
  }
  return merged;
}
