import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyProposal } from '../my-proposal';

const mockGetMine = jest.fn();
const mockSubmit = jest.fn();
const mockUpload = jest.fn();

jest.mock('../../lib/api/proposals', () => ({
  getMyProposal: (...args: unknown[]) => mockGetMine(...args),
  saveProposalDraft: jest.fn(),
  submitProposalStep: (...args: unknown[]) => mockSubmit(...args),
  uploadProposalCompletedFile: (...args: unknown[]) => mockUpload(...args),
  getProposalFileDownloadUrl: jest.fn(),
  addProposalComment: jest.fn(),
}));

jest.mock('../../lib/api-client', () => ({
  getResourceDownloadUrl: jest.fn(),
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
          stageLabel: null,
          fileName: null,
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
    expect(screen.getByText('Download Proposal booklet')).toBeInTheDocument();
    expect(screen.getByLabelText('Which step are you on?')).toBeInTheDocument();
    expect(screen.getByLabelText('Topic, research question, and summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Note to your coordinator')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send note' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit for review' });
    expect(submit).toBeDisabled();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText('Topic, research question, and summary'),
      'My research question'
    );
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Which step are you on?'), '1a');
    expect(submit).toBeDisabled();
    await user.upload(
      screen.getByLabelText('Completed file'),
      new File(['filled'], 'topic.pdf', { type: 'application/pdf' })
    );
    expect(submit).toBeEnabled();

    mockUpload.mockResolvedValue({
      pendingFileKey: 'pending-key',
      fileName: 'topic.pdf',
      fileMimeType: 'application/pdf',
      fileSizeBytes: 6,
    });
    mockSubmit.mockResolvedValue({
      currentStepKey: 'topic',
      catalog: [],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: 'submitted',
          body: 'My research question',
          stageLabel: '1a',
          fileName: 'topic.pdf',
          comments: [],
          resources: [],
          submittedAt: '2026-09-07T00:00:00.000Z',
          reviewedAt: null,
        },
      ],
    });
    await user.type(screen.getByLabelText('Note to your coordinator'), 'Please take a look');
    await user.click(submit);
    expect(mockUpload).toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledWith(
      'topic',
      'My research question',
      '1a',
      'Please take a look',
      {
        pendingFileKey: 'pending-key',
        fileName: 'topic.pdf',
        fileMimeType: 'application/pdf',
        fileSizeBytes: 6,
      }
    );
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
          stageLabel: '1a',
          fileName: 'topic.pdf',
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
    expect(screen.getByText('Marked as step 1a')).toBeInTheDocument();
    expect(screen.getByText('Download topic.pdf')).toBeInTheDocument();
    expect(screen.queryByLabelText('Note to your coordinator')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
  });

  it('does not repeat the last step in history once the proposal is complete', async () => {
    mockGetMine.mockResolvedValue({
      currentStepKey: 'final',
      catalog: [],
      steps: [
        {
          key: 'topic',
          title: 'Topic and research question',
          sortOrder: 1,
          available: true,
          status: 'approved',
          body: 'Topic body',
          stageLabel: '1c',
          comments: [
            {
              id: 'c1',
              body: 'Sharpen the question',
              authorName: 'Coordinator',
              createdAt: '2026-09-07T00:00:00.000Z',
            },
          ],
          resources: [],
          submittedAt: null,
          reviewedAt: null,
        },
        {
          key: 'outline',
          title: 'Outline',
          sortOrder: 2,
          available: true,
          status: 'approved',
          body: 'Outline body',
          stageLabel: '2a',
          comments: [],
          resources: [],
          submittedAt: null,
          reviewedAt: null,
        },
        {
          key: 'draft',
          title: 'Full draft',
          sortOrder: 3,
          available: true,
          status: 'approved',
          body: 'Draft body',
          stageLabel: '3',
          comments: [],
          resources: [],
          submittedAt: null,
          reviewedAt: null,
        },
        {
          key: 'final',
          title: 'Final proposal',
          sortOrder: 4,
          available: true,
          status: 'approved',
          body: 'Final body',
          stageLabel: '4b',
          comments: [],
          resources: [],
          submittedAt: null,
          reviewedAt: null,
        },
      ],
    });

    render(<MyProposal />);

    expect(await screen.findByText('Final proposal')).toBeInTheDocument();
    expect(screen.getAllByText('Final proposal')).toHaveLength(1);
    expect(screen.getByText('Topic and research question')).toBeInTheDocument();
    expect(screen.getByText('Sharpen the question')).toBeInTheDocument();
  });

  it('surfaces a load error', async () => {
    mockGetMine.mockRejectedValue(new Error('offline'));
    render(<MyProposal />);
    await waitFor(() => {
      expect(screen.getByText('offline')).toBeInTheDocument();
    });
  });
});
