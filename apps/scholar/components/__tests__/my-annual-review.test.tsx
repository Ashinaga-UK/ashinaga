import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AnnualUpdate } from '../../lib/api/annual-updates';
import { MyAnnualReview } from '../my-annual-review';

const mockGetMyAnnualUpdate = jest.fn();
const mockGetMyDraftAnnualUpdate = jest.fn();
const mockSaveAnnualUpdateDraft = jest.fn();
const mockSubmitAnnualUpdate = jest.fn();

jest.mock('../../lib/api/annual-updates', () => ({
  getMyAnnualUpdate: (...args: unknown[]) => mockGetMyAnnualUpdate(...args),
  getMyDraftAnnualUpdate: (...args: unknown[]) => mockGetMyDraftAnnualUpdate(...args),
  saveAnnualUpdateDraft: (...args: unknown[]) => mockSaveAnnualUpdateDraft(...args),
  submitAnnualUpdate: (...args: unknown[]) => mockSubmitAnnualUpdate(...args),
}));

function createAnnualUpdate(overrides: Partial<AnnualUpdate> = {}): AnnualUpdate {
  return {
    id: 'review-1',
    scholarId: 'scholar-1',
    academicYear: '2026/27',
    status: 'draft',
    highlights: 'A highlight',
    partTimeJobs: null,
    extracurriculars: null,
    leadershipRolesDescription: null,
    leadershipRolesCount: 2,
    payItForwardDescription: null,
    payItForwardCount: null,
    subSaharanAfricaActivitiesDescription: null,
    subSaharanAfricaActivitiesCount: null,
    independentInternshipsCount: null,
    internshipsInAfricaSummary: null,
    internshipsElsewhereSummary: null,
    completedAshinagaAfricaInternship: null,
    academicYearAverageClassification: null,
    academicYearWeightedGrade: null,
    submittedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MyAnnualReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyAnnualUpdate.mockResolvedValue(null);
    mockGetMyDraftAnnualUpdate.mockResolvedValue(null);
    mockSaveAnnualUpdateDraft.mockImplementation(async () =>
      createAnnualUpdate({ status: 'draft' })
    );
  });

  it('uses the requested copy and puts count questions before descriptions', async () => {
    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByText('Leadership and Impact')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'This review is for the academic year shown below. Share important moments you would like Ashinaga to know about.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Summarise your leadership roles and the ways you have passed kindness forward this year.'
      )
    ).toBeInTheDocument();

    const leadershipCount = screen.getByLabelText(
      /How many leadership roles have you held this year/i
    );
    const leadershipDescription = screen.getByLabelText(/Leadership roles description/i);
    expect(
      leadershipCount.compareDocumentPosition(leadershipDescription) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const payItForwardCount = screen.getByLabelText(
      /How many pay-it-forward activities have you taken part in this year/i
    );
    const payItForwardDescription = screen.getByLabelText(
      /How have you paid it forward this year/i
    );
    expect(
      payItForwardCount.compareDocumentPosition(payItForwardDescription) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(screen.getAllByPlaceholderText('e.g. 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(Enter a number)').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/How many pay-it-forward activities have you taken part in this year/)
        .textContent
    ).not.toContain('(Enter a number)');
  });

  it('loads an existing draft folded', async () => {
    mockGetMyDraftAnnualUpdate.mockResolvedValue(createAnnualUpdate({ status: 'draft' }));

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue editing' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Year Overview')).not.toBeInTheDocument();
    expect(
      screen.getByText('Your draft is saved. Continue editing whenever you are ready.')
    ).toBeInTheDocument();
  });

  it('folds the form after a draft is saved', async () => {
    const scrollTo = jest.fn();
    const { container } = render(
      <main>
        <MyAnnualReview />
      </main>
    );
    const inset = container.querySelector('main');
    if (inset) {
      inset.scrollTo = scrollTo;
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(screen.getByText('Draft saved.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Year Overview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('dismisses the draft saved message after a few seconds', async () => {
    jest.useFakeTimers({ advanceTimers: true });

    try {
      render(<MyAnnualReview />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

      await waitFor(() => {
        expect(screen.getByText('Draft saved.')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(screen.queryByText('Draft saved.')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows a single submitted confirmation and keeps the form folded', async () => {
    mockGetMyAnnualUpdate.mockResolvedValue(
      createAnnualUpdate({
        status: 'submitted',
        submittedAt: '2026-08-20T00:00:00.000Z',
      })
    );

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(
        screen.getByText('Your annual review has been submitted and can no longer be edited.')
      ).toBeInTheDocument();
    });

    expect(screen.queryByText('Annual review submitted.')).not.toBeInTheDocument();
    expect(screen.queryByText('Year Overview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View responses' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide responses' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View responses' }));

    expect(screen.getByText('Year Overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide responses' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View responses' })).not.toBeInTheDocument();
  });
});
