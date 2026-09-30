import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnnualReviewCopyEditor } from '../annual-review-copy-editor';

const mockGetAnnualReviewCopy = jest.fn();
const mockUpdateAnnualReviewCopy = jest.fn();

jest.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => (prop === '__esModule' ? true : () => null),
      }
    )
);

jest.mock('../../lib/api-client', () => ({
  getAnnualReviewCopy: (...args: unknown[]) => mockGetAnnualReviewCopy(...args),
  updateAnnualReviewCopy: (...args: unknown[]) => mockUpdateAnnualReviewCopy(...args),
}));

const strings = {
  'helpers.numberHint': '(Enter a number)',
  'sections.yearOverview.title': 'Year Overview',
  'sections.yearOverview.description': 'Year description',
  'questions.academicYear.prompt': 'Academic year',
  'questions.highlights.prompt': 'Highlights question',
  'sections.workAndActivities.title': 'Work And Activities',
  'sections.workAndActivities.description': 'Work description',
  'questions.partTimeJobs.prompt': 'Jobs question',
  'questions.extracurriculars.prompt': 'Activities question',
  'sections.leadershipAndImpact.title': 'Leadership and Impact',
  'sections.leadershipAndImpact.description': 'Leadership description',
  'questions.leadershipRolesCount.prompt': 'Leadership count',
  'questions.leadershipRolesDescription.prompt': 'Leadership roles',
  'questions.payItForwardCount.prompt': 'Pay it forward count',
  'questions.payItForwardDescription.prompt': 'Pay it forward description',
  'sections.africaEngagementAndInternships.title': 'Africa Engagement And Internships',
  'sections.africaEngagementAndInternships.description': 'Africa description',
  'questions.subSaharanAfricaActivitiesCount.prompt': 'Africa count',
  'questions.subSaharanAfricaActivitiesDescription.prompt': 'Africa activities',
  'questions.independentInternshipsCount.prompt': 'Internship count',
  'questions.internshipsInAfricaSummary.prompt': 'Africa internships',
  'questions.internshipsElsewhereSummary.prompt': 'Other internships',
  'questions.completedAshinagaAfricaInternship.prompt': 'Ashinaga internship',
  'sections.academicResults.title': 'Academic Results',
  'sections.academicResults.description': 'Results description',
  'questions.academicYearAverageClassification.prompt': 'Classification',
  'questions.academicYearWeightedGrade.prompt': 'Weighted grade',
};

describe('AnnualReviewCopyEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not show the editor to viewer staff', async () => {
    mockGetAnnualReviewCopy.mockResolvedValue({ version: 1, strings, canEdit: false });

    render(<AnnualReviewCopyEditor />);

    await waitFor(() => expect(mockGetAnnualReviewCopy).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Edit form copy' })).not.toBeInTheDocument();
  });

  it('lets an admin publish edited copy with the loaded version', async () => {
    mockGetAnnualReviewCopy.mockResolvedValue({ version: 3, strings, canEdit: true });
    mockUpdateAnnualReviewCopy.mockResolvedValue({
      version: 4,
      strings: { ...strings, 'sections.yearOverview.title': 'Your year' },
      canEdit: true,
    });

    render(<AnnualReviewCopyEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit form copy' }));
    fireEvent.change(screen.getAllByLabelText('Section title')[0], {
      target: { value: 'Your year' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish copy' }));

    await waitFor(() =>
      expect(mockUpdateAnnualReviewCopy).toHaveBeenCalledWith(3, {
        ...strings,
        'sections.yearOverview.title': 'Your year',
      })
    );
    expect(await screen.findByText('Annual Review copy published.')).toBeInTheDocument();
  });

  it('reloads the latest copy after a version conflict', async () => {
    const latestStrings = { ...strings, 'sections.yearOverview.title': 'Latest title' };
    mockGetAnnualReviewCopy
      .mockResolvedValueOnce({ version: 3, strings, canEdit: true })
      .mockResolvedValueOnce({ version: 4, strings: latestStrings, canEdit: true });
    mockUpdateAnnualReviewCopy.mockRejectedValue(new Error('API Error: 409 - conflict'));

    render(<AnnualReviewCopyEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit form copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish copy' }));

    expect(await screen.findByText(/Their latest version is loaded/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Section title')[0]).toHaveValue('Latest title');
  });
});
