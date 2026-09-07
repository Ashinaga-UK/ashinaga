import { render, screen, waitFor } from '@testing-library/react';
import { MyProposal } from '../my-proposal';

const mockGetMine = jest.fn();

jest.mock('../../lib/api/proposals', () => ({
  getMyProposal: (...args: unknown[]) => mockGetMine(...args),
  saveProposalDraft: jest.fn(),
  submitProposalStep: jest.fn(),
  addProposalComment: jest.fn(),
}));

describe('MyProposal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current step from the payload catalog', async () => {
    mockGetMine.mockResolvedValue({
      currentStepKey: 'topic',
      catalog: [{ key: 'topic', title: 'Topic and research question', sortOrder: 1 }],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: null,
          body: null,
          comments: [],
          resources: [
            {
              id: 'r1',
              title: 'Proposal booklet',
              description: '',
              sourceType: 'url',
              url: 'https://example.com',
            },
          ],
          submittedAt: null,
          reviewedAt: null,
        },
      ],
    });

    render(<MyProposal />);

    expect(await screen.findByText('Topic and research question')).toBeInTheDocument();
    expect(screen.getByText('Proposal booklet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeInTheDocument();
  });

  it('shows waiting copy when the current step is submitted', async () => {
    mockGetMine.mockResolvedValue({
      currentStepKey: 'topic',
      catalog: [],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: 'submitted',
          body: 'Waiting text',
          comments: [],
          resources: [],
          submittedAt: '2026-09-07T00:00:00.000Z',
          reviewedAt: null,
        },
      ],
    });

    render(<MyProposal />);

    expect(await screen.findByText('Waiting for coordinator review')).toBeInTheDocument();
    expect(screen.getByText('Waiting text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
  });

  it('surfaces a load error', async () => {
    mockGetMine.mockRejectedValue(new Error('offline'));
    render(<MyProposal />);
    await waitFor(() => {
      expect(screen.getByText('offline')).toBeInTheDocument();
    });
  });
});
