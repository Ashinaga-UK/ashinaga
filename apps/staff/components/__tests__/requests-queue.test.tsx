import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestsQueue } from '../requests-queue';

const replace = jest.fn();
const bulkUpdateRequestStatus = jest.fn();

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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('tab=requests'),
}));

jest.mock('../../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'staff-1' } } }),
}));

jest.mock('../../lib/api-client', () => ({
  getRequests: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'req-1',
        scholarId: 'scholar-1',
        scholarName: 'Ada Lovelace',
        scholarEmail: 'ada@example.com',
        type: 'others',
        description: 'Need a letter',
        priority: 'medium',
        status: 'pending',
        submittedDate: '2026-01-01T00:00:00.000Z',
        assignees: [],
        attachments: [],
        auditLogs: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }),
  getFilterOptions: jest.fn().mockResolvedValue({
    programs: ['Engineering'],
    years: ['2026'],
    universities: [],
    intendedUniversities: [],
    intendedCourses: [],
  }),
  getScholars: jest.fn().mockResolvedValue({
    data: [{ id: 'scholar-1', name: 'Ada Lovelace' }],
    pagination: { page: 1, limit: 8, totalItems: 1, totalPages: 1, hasNext: false, hasPrev: false },
  }),
  bulkUpdateRequestStatus: (...args: unknown[]) => bulkUpdateRequestStatus(...args),
}));

jest.mock('../request-management', () => ({
  RequestManagement: () => <div>Request row</div>,
}));

jest.mock('../staff-other-request-dialog', () => ({
  StaffOtherRequestDialog: () => null,
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

describe('RequestsQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('applies the remembered programme and year without those filters already set', async () => {
    localStorage.setItem(
      'ashinaga.requests.cohort.v1.staff-1',
      JSON.stringify({ version: 1, program: 'Engineering', year: '2026' })
    );
    const user = userEvent.setup();
    render(<RequestsQueue onReviewed={jest.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Pending, Engineering 2026' }));

    expect(replace).toHaveBeenCalledWith(expect.stringContaining('program=Engineering'));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('year=2026'));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('status=pending'));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('sortOrder=asc'));
  });

  it('applies the pending oldest-first preset to the query string', async () => {
    const user = userEvent.setup();
    render(<RequestsQueue onReviewed={jest.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Pending, oldest first' }));

    expect(replace).toHaveBeenCalledWith(expect.stringContaining('status=pending'));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('sortBy=submittedDate'));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('sortOrder=asc'));
  });

  it('does not bulk reject until a reason is entered', async () => {
    const user = userEvent.setup();
    render(<RequestsQueue onReviewed={jest.fn()} />);

    await user.click(
      await screen.findByRole('checkbox', { name: 'Select request from Ada Lovelace' })
    );
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const confirm = screen.getByRole('button', { name: 'Reject selected' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), 'Missing documents');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => {
      expect(bulkUpdateRequestStatus).toHaveBeenCalledWith({
        ids: ['req-1'],
        status: 'rejected',
        comment: 'Missing documents',
      });
    });
  });

  it('filters the queue by the selected student', async () => {
    const user = userEvent.setup();
    render(<RequestsQueue onReviewed={jest.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Filter by student' }));
    await user.type(screen.getByPlaceholderText('Student name'), 'Ada');
    await user.click(await screen.findByText('Ada Lovelace'));

    expect(replace).toHaveBeenCalledWith(expect.stringContaining('scholarId=scholar-1'));
  });
});
