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

export type AnnualReviewCopy = Record<keyof typeof DEFAULT_ANNUAL_REVIEW_COPY, string>;

const ANNUAL_REVIEW_COPY_KEYS = Object.keys(
  DEFAULT_ANNUAL_REVIEW_COPY
) as (keyof typeof DEFAULT_ANNUAL_REVIEW_COPY)[];

export function mergeAnnualReviewCopy(
  value: Partial<Record<keyof AnnualReviewCopy, string>> | null | undefined
): AnnualReviewCopy {
  const merged = {} as AnnualReviewCopy;
  for (const key of ANNUAL_REVIEW_COPY_KEYS) {
    const storedValue = value?.[key];
    merged[key] =
      typeof storedValue === 'string' && storedValue.trim() !== ''
        ? storedValue
        : DEFAULT_ANNUAL_REVIEW_COPY[key];
  }
  return merged;
}
