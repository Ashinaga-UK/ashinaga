import { render, screen, waitFor } from '@testing-library/react';
import ScholarRootLayout from './layout';

const mockRefetch = jest.fn();
const mockSession: {
  isPending: boolean;
  data: { user: { userType: string } } | null;
} = {
  isPending: true,
  data: null,
};

jest.mock('../../lib/auth-client', () => ({
  useSession: () => ({
    data: mockSession.data,
    isPending: mockSession.isPending,
    refetch: mockRefetch,
  }),
  signOut: jest.fn(),
}));

jest.mock('../../components/scholar-layout', () => ({
  ScholarLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scholar-shell">{children}</div>
  ),
}));

describe('ScholarRootLayout session gate', () => {
  beforeEach(() => {
    mockRefetch.mockReset();
    mockSession.isPending = true;
    mockSession.data = null;
  });

  it('reads the session immediately while it is still pending', async () => {
    render(
      <ScholarRootLayout>
        <p>Dashboard</p>
      </ScholarRootLayout>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('scholar-shell')).not.toBeInTheDocument();
  });

  it('renders the shell once the session is a scholar', () => {
    mockSession.isPending = false;
    mockSession.data = { user: { userType: 'scholar' } };

    render(
      <ScholarRootLayout>
        <p>Dashboard</p>
      </ScholarRootLayout>
    );

    expect(screen.getByTestId('scholar-shell')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
