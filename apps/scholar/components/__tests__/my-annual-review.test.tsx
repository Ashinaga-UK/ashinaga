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

jest.mock('../../lib/academic-year', () => ({
  getFilableAcademicYears: () => ['2025/2026', '2024/2025', '2023/2024', '2022/2023'],
  toCanonicalAcademicYear: (value: string) => (value === '2025/26' ? '2025/2026' : value),
}));

function createAnnualUpdate(overrides: Partial<AnnualUpdate> = {}): AnnualUpdate {
  return {
    id: 'review-1',
    scholarId: 'scholar-1',
    academicYear: '2025/2026',
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

async function openAcademicYearOptions() {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Academic year' }), {
    pointerId: 1,
    button: 0,
  });
  fireEvent.click(screen.getByRole('combobox', { name: 'Academic year' }));
  return screen.findByRole('option', { name: '2024/2025' });
}

describe('MyAnnualReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyAnnualUpdate.mockResolvedValue(null);
    mockGetMyDraftAnnualUpdate.mockResolvedValue(null);
    mockSaveAnnualUpdateDraft.mockImplementation(async () =>
      createAnnualUpdate({ status: 'draft' })
    );
    HTMLElement.prototype.hasPointerCapture = jest.fn();
    HTMLElement.prototype.releasePointerCapture = jest.fn();
    HTMLElement.prototype.scrollIntoView = jest.fn();
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

  it('uses a year dropdown defaulting to the completed teaching year', async () => {
    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Academic year' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('textbox', { name: 'Academic year' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Academic year' })).not.toBeDisabled();
    expect(mockGetMyAnnualUpdate).toHaveBeenCalledWith('2025/2026');
    expect(mockGetMyDraftAnnualUpdate).not.toHaveBeenCalled();

    await openAcademicYearOptions();

    expect(screen.getByRole('option', { name: '2025/2026' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2024/2025' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2026/2027' })).not.toBeInTheDocument();
  });

  it('loads only the selected academic year', async () => {
    mockGetMyAnnualUpdate.mockImplementation(async (academicYear: string) => {
      if (academicYear === '2024/2025') {
        return createAnnualUpdate({
          academicYear: '2024/2025',
          status: 'draft',
          highlights: 'Older year draft',
        });
      }

      return null;
    });

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Academic year' })).toBeInTheDocument();
    });

    await openAcademicYearOptions();
    fireEvent.click(screen.getByRole('option', { name: '2024/2025' }));

    await waitFor(() => {
      expect(mockGetMyAnnualUpdate).toHaveBeenCalledWith('2024/2025');
    });

    expect(mockGetMyDraftAnnualUpdate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Resumed your draft/)).not.toBeInTheDocument();
    expect(await screen.findByText('2024/2025 Annual Review')).toBeInTheDocument();
  });

  it('confirms before switching year when the form is dirty', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Academic year' })).toBeInTheDocument();
    });

    const highlights = document.getElementById('highlights');
    expect(highlights).not.toBeNull();
    fireEvent.change(highlights as HTMLElement, { target: { value: 'Unsaved highlight' } });

    mockGetMyAnnualUpdate.mockClear();
    await openAcademicYearOptions();
    fireEvent.click(screen.getByRole('option', { name: '2024/2025' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Switch academic year and discard them?'
    );
    expect(mockGetMyAnnualUpdate).not.toHaveBeenCalledWith('2024/2025');
    expect(screen.getByRole('combobox', { name: 'Academic year' })).toHaveTextContent('2025/2026');

    confirmSpy.mockReturnValue(true);
    await openAcademicYearOptions();
    fireEvent.click(screen.getByRole('option', { name: '2024/2025' }));

    await waitFor(() => {
      expect(mockGetMyAnnualUpdate).toHaveBeenCalledWith('2024/2025');
    });

    confirmSpy.mockRestore();
  });

  it('opens a legacy YYYY/YY submitted row from the canonical year', async () => {
    mockGetMyAnnualUpdate.mockResolvedValue(
      createAnnualUpdate({
        academicYear: '2025/26',
        status: 'submitted',
        submittedAt: '2026-08-20T00:00:00.000Z',
        highlights: 'Legacy year answers',
      })
    );

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(
        screen.getByText('Your annual review has been submitted and can no longer be edited.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View responses' }));

    expect(screen.getByRole('combobox', { name: 'Academic year' })).not.toBeDisabled();
    expect(screen.getByDisplayValue('Legacy year answers')).toBeDisabled();
  });

  it('loads an existing draft folded', async () => {
    mockGetMyAnnualUpdate.mockResolvedValue(createAnnualUpdate({ status: 'draft' }));

    render(<MyAnnualReview />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue editing' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Year Overview')).not.toBeInTheDocument();
    expect(
      screen.getByText('Your draft is saved. Continue editing whenever you are ready.')
    ).toBeInTheDocument();
    expect(mockGetMyDraftAnnualUpdate).not.toHaveBeenCalled();
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
