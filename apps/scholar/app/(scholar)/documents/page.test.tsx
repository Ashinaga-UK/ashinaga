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

jest.mock('../../../components/my-documents', () => ({
  MyDocuments: () => <div>Documents checklist</div>,
}));

import { ScholarSessionProvider } from '../../../lib/scholar-session';
import DocumentsPage from './page';

function renderPage() {
  return render(
    <ScholarSessionProvider>
      <DocumentsPage />
    </ScholarSessionProvider>
  );
}

describe('DocumentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects confirmed scholars to the dashboard', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Documents checklist')).not.toBeInTheDocument();
  });

  it('renders documents for prep-year candidates', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    renderPage();

    expect(await screen.findByText('Documents checklist')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard if profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByText('Documents checklist')).not.toBeInTheDocument();
  });
});
