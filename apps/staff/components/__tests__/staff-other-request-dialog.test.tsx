import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffOtherRequestDialog } from '../staff-other-request-dialog';

const mockToast = jest.fn();
const mockGetAllActiveScholars = jest.fn();
const mockCreateStaffRequest = jest.fn();

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
  createStaffRequest: (...args: unknown[]) => mockCreateStaffRequest(...args),
  getAllActiveScholars: () => mockGetAllActiveScholars(),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('StaffOtherRequestDialog', () => {
  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: () => false },
      setPointerCapture: { value: () => undefined },
      releasePointerCapture: { value: () => undefined },
      scrollIntoView: { value: () => undefined },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateStaffRequest.mockResolvedValue({ id: 'request-1' });
    mockGetAllActiveScholars.mockResolvedValue([
      {
        id: 'scholar-1',
        userId: 'user-1',
        name: 'Ada Scholar',
        email: 'ada@example.com',
        program: 'Scholar',
        year: '2026',
        university: 'Example University',
        status: 'active',
        programStage: 'scholar',
        startDate: '2026-01-01',
        goals: { total: 0, completed: 0, inProgress: 0, pending: 0 },
        tasks: { total: 0, completed: 0, overdue: 0, dueToday: 0 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
  });

  it('loads scholars when staff open the creation dialog', async () => {
    const user = userEvent.setup();
    render(<StaffOtherRequestDialog onSuccess={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create Other request' }));

    expect(screen.getByRole('dialog', { name: 'Create Other request' })).toBeInTheDocument();
    await waitFor(() => expect(mockGetAllActiveScholars).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('combobox', { name: 'Scholar' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
  });

  it('creates an Other request for the selected scholar', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    render(<StaffOtherRequestDialog onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Create Other request' }));
    await waitFor(() => expect(mockGetAllActiveScholars).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('combobox', { name: 'Scholar' }));
    await user.click(screen.getByRole('option', { name: 'Ada Scholar (ada@example.com)' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Please review this non-standard scholar request.'
    );
    await user.click(screen.getByRole('button', { name: 'Create request' }));

    await waitFor(() =>
      expect(mockCreateStaffRequest).toHaveBeenCalledWith({
        scholarId: 'scholar-1',
        description: 'Please review this non-standard scholar request.',
        priority: 'medium',
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
