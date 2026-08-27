import { render, screen, waitFor } from '@testing-library/react';

const mockReplace = jest.fn();
const mockGetMyProfile = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('../../../lib/api/profile', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
}));

jest.mock('../../../components/my-annual-review', () => ({
  MyAnnualReview: () => <div>Annual review content</div>,
}));

import { ScholarSessionProvider } from '../../../lib/scholar-session';
import AnnualReviewPage from './page';

function renderPage() {
  return render(
    <ScholarSessionProvider>
      <AnnualReviewPage />
    </ScholarSessionProvider>
  );
}

describe('AnnualReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects prep-year users to the dashboard', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Annual review content')).not.toBeInTheDocument();
  });

  it('renders annual review for confirmed scholars', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });

    renderPage();

    expect(await screen.findByText('Annual review content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard if profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Annual review content')).not.toBeInTheDocument();
  });
});
