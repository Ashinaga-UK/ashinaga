import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Request } from '../../lib/api-client';
import { RequestManagement } from '../request-management';

const mockToast = jest.fn();

// lucide-react ships as ESM, which Jest's transform ignores under node_modules.
// Stub every icon with a no-op component so the icons don't break the render.
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
  updateRequestStatus: jest.fn().mockResolvedValue({}),
  deleteRequest: jest.fn(),
  getFileDownloadUrl: jest.fn(),
}));

jest.mock('../../lib/auth-client', () => ({
  useSession: jest.fn(),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Pull in the mocked modules so we can assert against them.
const { updateRequestStatus } = jest.requireMock('../../lib/api-client') as {
  updateRequestStatus: jest.Mock;
};
const { useSession } = jest.requireMock('../../lib/auth-client') as {
  useSession: jest.Mock;
};

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    scholarId: 'scholar-1',
    scholarName: 'Test Scholar',
    scholarEmail: 'scholar@example.com',
    type: 'summer_funding_request',
    description: 'Summer funding application',
    formData: null,
    priority: 'medium',
    status: 'pending',
    submittedDate: '2026-01-01T00:00:00.000Z',
    reviewedBy: null,
    reviewComment: null,
    reviewDate: null,
    assignees: [],
    attachments: [],
    auditLogs: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RequestManagement — Request More Information (commented) action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.mockReturnValue({
      data: { user: { id: 'staff-1', email: 'staff@example.com' } },
      isPending: false,
    });
  });

  it('exposes a "Request More Information" button in the review dialog for a pending request', async () => {
    const user = userEvent.setup();
    render(<RequestManagement request={buildRequest()} onStatusUpdate={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Review$/i }));

    expect(
      await screen.findByRole('button', { name: /Request More Information/i })
    ).toBeInTheDocument();
  });

  it('sets the request status to "commented" with the staff comment when info is requested', async () => {
    const user = userEvent.setup();
    const onStatusUpdate = jest.fn();
    render(<RequestManagement request={buildRequest()} onStatusUpdate={onStatusUpdate} />);

    await user.click(screen.getByRole('button', { name: /^Review$/i }));

    const commentBox = await screen.findByLabelText(/Comments/i);
    await user.type(commentBox, 'Please attach your bank statement.');

    await user.click(screen.getByRole('button', { name: /Request More Information/i }));

    await waitFor(() => {
      expect(updateRequestStatus).toHaveBeenCalledWith(
        'req-1',
        'commented',
        'Please attach your bank statement.',
        'staff-1'
      );
    });
    expect(onStatusUpdate).toHaveBeenCalledWith(
      'req-1',
      'commented',
      'Please attach your bank statement.'
    );
  });

  it('requires a comment before requesting more information', async () => {
    const user = userEvent.setup();
    render(<RequestManagement request={buildRequest()} onStatusUpdate={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Review$/i }));
    await user.click(await screen.findByRole('button', { name: /Request More Information/i }));

    expect(updateRequestStatus).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
