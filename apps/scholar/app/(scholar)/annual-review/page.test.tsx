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

import AnnualReviewPage from './page';

describe('AnnualReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects prep-year users to the dashboard', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    render(<AnnualReviewPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Annual review content')).not.toBeInTheDocument();
  });

  it('renders annual review for confirmed scholars', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });

    render(<AnnualReviewPage />);

    expect(await screen.findByText('Annual review content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
