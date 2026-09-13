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

jest.mock('../../../components/my-proposal', () => ({
  MyProposal: () => <div>Proposal content</div>,
}));

import { ScholarSessionProvider } from '../../../lib/scholar-session';
import ProposalPage from './page';

function renderPage() {
  return render(
    <ScholarSessionProvider>
      <ProposalPage />
    </ScholarSessionProvider>
  );
}

describe('ProposalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the proposal for prep-year users', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });
    renderPage();
    expect(await screen.findByText('Proposal content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders the proposal for confirmed scholars', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });
    renderPage();
    expect(await screen.findByText('Proposal content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows loading while the profile is still fetching', () => {
    mockGetMyProfile.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Proposal content')).not.toBeInTheDocument();
    expect(screen.queryByText('Redirecting...')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard if profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));
    renderPage();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Proposal content')).not.toBeInTheDocument();
  });
});
