import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProposalInbox } from '../proposal-inbox';

const mockInbox = jest.fn();
const mockOnOpen = jest.fn();

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
  getProposalInbox: (...args: unknown[]) => mockInbox(...args),
}));

function renderInbox() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalInbox onOpenScholar={mockOnOpen} />
    </QueryClientProvider>
  );
}

describe('ProposalInbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the scholar proposal tab from a submitted step', async () => {
    mockInbox.mockResolvedValue([
      {
        scholarId: 'scholar-1',
        scholarName: 'Ada Prep',
        stepKey: 'topic',
        stepTitle: 'Topic and research question',
        submittedAt: '2026-09-07T00:00:00.000Z',
      },
    ]);

    const user = userEvent.setup();
    renderInbox();

    expect(await screen.findByText('Ada Prep')).toBeInTheDocument();
    expect(screen.getByText('Topic and research question')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(mockOnOpen).toHaveBeenCalledWith('scholar-1');
  });

  it('shows an empty state when nothing is waiting', async () => {
    mockInbox.mockResolvedValue([]);
    renderInbox();
    expect(await screen.findByText('No submitted proposal steps waiting.')).toBeInTheDocument();
  });
});
