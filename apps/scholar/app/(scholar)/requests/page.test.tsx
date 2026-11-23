import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseMyRequests = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyRequests: () => mockUseMyRequests(),
}));

jest.mock('../../../components/new-request-dialog', () => ({
  NewRequestDialog: ({ trigger, onSuccess }: { trigger?: ReactNode; onSuccess?: () => void }) => (
    <div data-testid="new-request-dialog">
      {trigger}
      <button type="button" onClick={onSuccess}>
        simulate-success
      </button>
    </div>
  ),
}));

jest.mock('../../../components/request-card', () => ({
  RequestCard: ({ request }: { request: { id: string } }) => <div>request-{request.id}</div>,
}));

import RequestsPage from './page';

describe('RequestsPage empty state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an inline New Request CTA when there are no requests', () => {
    mockUseMyRequests.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<RequestsPage />);

    expect(screen.getByText('No requests yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit your first request/i })).toBeInTheDocument();
    // header trigger + inline trigger
    expect(screen.getAllByTestId('new-request-dialog')).toHaveLength(2);
  });

  it('refetches when a request is created from the empty state', () => {
    mockUseMyRequests.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<RequestsPage />);
    const dialogs = screen.getAllByTestId('new-request-dialog');
    fireEvent.click(dialogs[1].querySelector('button:last-child') as HTMLButtonElement);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not show the empty state when requests exist', () => {
    mockUseMyRequests.mockReturnValue({
      data: [{ id: '1' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<RequestsPage />);

    expect(screen.queryByText('No requests yet')).not.toBeInTheDocument();
    expect(screen.getByText('request-1')).toBeInTheDocument();
  });
});
