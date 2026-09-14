import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProposalPanel } from '../proposal-panel';

const mockGetProposal = jest.fn();
const mockReview = jest.fn();
const mockToast = jest.fn();

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
  getScholarProposal: (...args: unknown[]) => mockGetProposal(...args),
  reviewProposalStep: (...args: unknown[]) => mockReview(...args),
  addStaffProposalComment: jest.fn(),
  getResourceDownloadUrl: jest.fn(),
  getScholarProposalFileDownloadUrl: jest.fn(),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalPanel scholarId="scholar-1" />
    </QueryClientProvider>
  );
}

describe('ProposalPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProposal.mockResolvedValue({
      currentStepKey: 'topic',
      catalog: [{ key: 'topic', title: 'Topic and research question', sortOrder: 1 }],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: 'submitted',
          body: 'A research question',
          stageLabel: '1b',
          fileName: 'topic.pdf',
          comments: [],
          resources: [],
          submittedAt: '2026-09-07T00:00:00.000Z',
          reviewedAt: null,
        },
      ],
    });
    mockReview.mockResolvedValue({ currentStepKey: 'outline', catalog: [], steps: [] });
  });

  it('shows submitted text and can approve', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByText('A research question')).toBeInTheDocument();
    expect(screen.getByText(/scholar is on 1b/)).toBeInTheDocument();
    expect(screen.getByText('Download topic.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(mockReview).toHaveBeenCalledWith('scholar-1', 'topic', {
      action: 'approve',
      comment: undefined,
    });
  });

  it('keeps add comment available on an approved step', async () => {
    mockGetProposal.mockResolvedValue({
      currentStepKey: 'outline',
      catalog: [],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: 'approved',
          body: 'Approved text',
          stageLabel: '1c',
          fileName: 'topic.pdf',
          comments: [],
          resources: [],
          submittedAt: '2026-09-07T00:00:00.000Z',
          reviewedAt: '2026-09-07T01:00:00.000Z',
        },
      ],
    });

    renderPanel();

    expect(await screen.findByText('Approved text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('requires a comment to request changes', async () => {
    const user = userEvent.setup();
    renderPanel();

    const requestChanges = await screen.findByRole('button', { name: 'Request changes' });
    expect(requestChanges).toBeDisabled();
    await user.type(
      screen.getByPlaceholderText('Comment (required to request changes)'),
      'Sharpen'
    );
    await user.click(requestChanges);
    expect(mockReview).toHaveBeenCalledWith('scholar-1', 'topic', {
      action: 'request_changes',
      comment: 'Sharpen',
    });
  });
});
