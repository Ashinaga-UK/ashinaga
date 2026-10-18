import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Scholar } from '../../lib/api-client';
import { ScholarManagementTable } from '../scholar-management-table';

const mockGetScholars = jest.fn();
const mockGetFilterOptions = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
const mockDelete = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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
  getScholars: (...args: unknown[]) => mockGetScholars(...args),
  getFilterOptions: (...args: unknown[]) => mockGetFilterOptions(...args),
  downloadAllScholarsCSV: jest.fn(),
}));

jest.mock('../../lib/hooks/use-queries', () => ({
  useArchiveScholar: () => ({ mutateAsync: mockArchive }),
  useRestoreScholar: () => ({ mutateAsync: mockRestore }),
  useDeleteScholar: () => ({ mutateAsync: mockDelete }),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('../task-assignment', () => ({
  TaskAssignment: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

jest.mock('../bulk-task-assignment', () => ({
  BulkTaskAssignment: () => null,
}));

const archivedScholar: Scholar = {
  id: 'scholar-archived',
  userId: 'user-archived',
  name: 'Archived Ada',
  email: 'ada.archived@example.com',
  program: 'Computer Science',
  year: 'Year 2',
  university: 'MIT',
  status: 'archived',
  programStage: 'scholar',
  startDate: '2024-01-01T00:00:00.000Z',
  goals: { total: 1, completed: 0, inProgress: 1, pending: 0 },
  tasks: { total: 1, completed: 0, overdue: 0, dueToday: 0 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const activeScholar: Scholar = {
  ...archivedScholar,
  id: 'scholar-active',
  userId: 'user-active',
  name: 'Active Ada',
  email: 'ada.active@example.com',
  status: 'active',
};

const emptyPagination = {
  page: 1,
  limit: 20,
  totalItems: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

function renderTable() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ScholarManagementTable onViewProfile={jest.fn()} onOnboardScholar={jest.fn()} />
    </QueryClientProvider>
  );
}

async function openFirstActionsMenu(scholarName: string) {
  const user = userEvent.setup();
  const actionButtons = await screen.findAllByRole('button', {
    name: new RegExp(`actions for ${scholarName}`, 'i'),
  });
  await user.click(actionButtons[0]!);
  return user;
}

describe('ScholarManagementTable restore (ASH-136)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFilterOptions.mockResolvedValue({
      programs: ['Computer Science'],
      years: ['Year 2'],
      universities: ['MIT'],
      intendedUniversities: [],
      intendedCourses: [],
    });
    mockRestore.mockResolvedValue({ ...archivedScholar, status: 'active' });
  });

  it('shows Restore for archived scholars and restores them to active', async () => {
    mockGetScholars.mockResolvedValue({
      data: [archivedScholar],
      pagination: emptyPagination,
    });

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderTable();

    await screen.findAllByText('Archived Ada');
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();

    const user = await openFirstActionsMenu('Archived Ada');

    const restoreItem = await screen.findByRole('menuitem', { name: /restore/i });
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();

    await user.click(restoreItem);

    await waitFor(() => expect(mockRestore).toHaveBeenCalledWith('scholar-archived'));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Scholar restored',
        description: 'Archived Ada is active again.',
      })
    );
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('keeps Archive and Delete as separate actions for active scholars', async () => {
    mockGetScholars.mockResolvedValue({
      data: [activeScholar],
      pagination: emptyPagination,
    });

    renderTable();
    await screen.findAllByText('Active Ada');

    await openFirstActionsMenu('Active Ada');

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /^archive$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /restore/i })).not.toBeInTheDocument();
  });

  it('shows failure feedback when restore fails', async () => {
    mockGetScholars.mockResolvedValue({
      data: [archivedScholar],
      pagination: emptyPagination,
    });
    mockRestore.mockRejectedValueOnce(new Error('Scholar not found'));

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderTable();
    await screen.findAllByText('Archived Ada');

    const user = await openFirstActionsMenu('Archived Ada');
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not restore scholar',
          description: 'Scholar not found',
          variant: 'destructive',
        })
      )
    );
    confirm.mockRestore();
  });
});
