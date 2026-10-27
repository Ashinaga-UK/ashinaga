import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { StaffMember } from '../../lib/api-client';
import { ActiveStaffList } from '../invitations-management';

const mockGetStaffForManagement = jest.fn();
const mockSetStaffAdmin = jest.fn();
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
  getStaffForManagement: (...args: unknown[]) => mockGetStaffForManagement(...args),
  setStaffAdmin: (...args: unknown[]) => mockSetStaffAdmin(...args),
  removeStaffMember: jest.fn(),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 'staff-row',
    userId: 'user-1',
    name: 'Ada Viewer',
    email: 'ada@example.com',
    role: 'viewer',
    isSuperAdmin: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    isSelf: false,
    ...overrides,
  };
}

const self = member({
  id: 'staff-self',
  userId: 'user-self',
  name: 'Sam Super',
  email: 'sam@example.com',
  role: 'admin',
  isSuperAdmin: true,
  isSelf: true,
});
const viewer = member({});

describe('ActiveStaffList admin actions (ASH-120)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides Make admin and Remove admin when the caller cannot manage staff', async () => {
    mockGetStaffForManagement.mockResolvedValue({ staff: [self, viewer], canManage: false });

    render(<ActiveStaffList />);

    await screen.findAllByText('Ada Viewer');
    expect(screen.queryByRole('button', { name: /make admin/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove admin/i })).toBeNull();
  });

  it('disables the admin action on your own row', async () => {
    mockGetStaffForManagement.mockResolvedValue({ staff: [self, viewer], canManage: true });

    render(<ActiveStaffList />);

    const removeOnSelf = await screen.findAllByRole('button', { name: /remove admin/i });
    expect(removeOnSelf.length).toBeGreaterThan(0);
    for (const button of removeOnSelf) {
      expect(button).toBeDisabled();
    }
    for (const button of screen.getAllByRole('button', { name: /make admin/i })) {
      expect(button).toBeEnabled();
    }
  });

  it('names every right Make admin grants in the confirm dialog', async () => {
    mockGetStaffForManagement.mockResolvedValue({ staff: [self, viewer], canManage: true });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ActiveStaffList />);

    const [makeAdmin] = await screen.findAllByRole('button', { name: /make admin/i });
    fireEvent.click(makeAdmin);

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    const message = confirm.mock.calls[0]?.[0] as string;
    expect(message).toContain('Give Ada Viewer admin access?');
    expect(message).toContain('remove staff');
    expect(message).toContain('see all scholar requests');
    expect(message).toContain('edit annual-review copy');
    expect(message).toContain('edit platform links');
    // Declining the confirm sends nothing.
    expect(mockSetStaffAdmin).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
