import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// Mock the api-client (not the mutation hooks) so the component runs against the real
// react-query mutations and their real isPending lifecycle.
jest.mock('../../lib/api-client', () => ({
  ...jest.requireActual('../../lib/api-client'),
  getScholars: (...args: unknown[]) => mockGetScholars(...args),
  getFilterOptions: (...args: unknown[]) => mockGetFilterOptions(...args),
  downloadAllScholarsCSV: jest.fn(),
  archiveScholar: (...args: unknown[]) => mockArchive(...args),
  restoreScholar: (...args: unknown[]) => mockRestore(...args),
  deleteScholar: (...args: unknown[]) => mockDelete(...args),
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

type MenuKind = 'mobile' | 'desktop';

async function openActionsMenu(
  scholarName: string,
  kind: MenuKind = 'mobile',
  user = userEvent.setup()
) {
  // Both the mobile card list and the desktop table are in the DOM under jsdom (no CSS).
  const actionButtons = await screen.findAllByRole('button', {
    name: new RegExp(`actions for ${scholarName}`, 'i'),
  });
  await user.click(actionButtons[kind === 'mobile' ? 0 : 1]!);
  return user;
}

async function openFirstActionsMenu(scholarName: string) {
  return openActionsMenu(scholarName, 'mobile');
}

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const calledWithIds = (mock: jest.Mock) => mock.mock.calls.map((c) => c[0]);

describe('ScholarManagementTable restore (ASH-136, ASH-144)', () => {
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

    await waitFor(() => expect(calledWithIds(mockRestore)).toEqual(['scholar-archived']));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Scholar restored',
        description: 'Archived Ada is active again.',
      })
    );
    expect(confirm).toHaveBeenCalledWith(
      'Restore "Archived Ada"? Their status will be set to Active and they will leave the Archived list.'
    );
    expect(confirm.mock.calls[0]?.[0]).not.toMatch(/back to Active|active Scholars list/);
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

describe('ScholarManagementTable restore stays on the current filter (ASH-144)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFilterOptions.mockResolvedValue({
      programs: [],
      years: [],
      universities: [],
      intendedUniversities: [],
      intendedCourses: [],
    });
    mockRestore.mockResolvedValue({ ...archivedScholar, status: 'active' });
  });

  beforeAll(() => {
    Object.defineProperties(window.HTMLElement.prototype, {
      hasPointerCapture: { value: () => false, configurable: true },
      setPointerCapture: { value: () => undefined, configurable: true },
      releasePointerCapture: { value: () => undefined, configurable: true },
      scrollIntoView: { value: () => undefined, configurable: true },
    });
  });

  it('keeps the Archived status filter after restoring', async () => {
    mockGetScholars.mockResolvedValue({ data: [archivedScholar], pagination: emptyPagination });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderTable();
    await screen.findAllByText('Archived Ada');

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Archived' }));
    await waitFor(() =>
      expect(mockGetScholars).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'archived' })
      )
    );

    await openActionsMenu('Archived Ada', 'mobile', user);
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));
    await waitFor(() => expect(calledWithIds(mockRestore)).toEqual(['scholar-archived']));

    // The post-restore refetch must still ask for archived, and the filter UI must not flip.
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockGetScholars).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'archived' })
      )
    );
    expect(mockGetScholars).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'active' })
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Archived');
    confirm.mockRestore();
  });
});

describe('ScholarManagementTable lifecycle guard (ASH-146)', () => {
  let confirm: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFilterOptions.mockResolvedValue({
      programs: [],
      years: [],
      universities: [],
      intendedUniversities: [],
      intendedCourses: [],
    });
    confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    confirm.mockRestore();
    alertSpy.mockRestore();
  });

  async function expectLifecycleItemsDisabled(
    scholarName: string,
    kind: MenuKind,
    names: RegExp[],
    user: ReturnType<typeof userEvent.setup>
  ) {
    await openActionsMenu(scholarName, kind, user);
    const menu = await screen.findByRole('menu');
    for (const name of names) {
      expect(within(menu).getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
    }
    // View Profile is not a lifecycle action and stays usable.
    expect(within(menu).getByRole('menuitem', { name: /view profile/i })).not.toHaveAttribute(
      'aria-disabled'
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  }

  it('confirms and mutates once on double-click while restore is in flight, closing the menu', async () => {
    mockGetScholars.mockResolvedValue({ data: [archivedScholar], pagination: emptyPagination });
    const pending = deferred();
    mockRestore.mockReturnValue(pending.promise);
    renderTable();
    await screen.findAllByText('Archived Ada');

    const user = await openActionsMenu('Archived Ada', 'mobile');
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));

    // Menu closes on select (no preventDefault), so the user can't keep hammering it.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));

    // Re-open and click the (disabled) item again while the first request is pending.
    await openActionsMenu('Archived Ada', 'mobile', user);
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockRestore).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ ...archivedScholar, status: 'active' });
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Scholar restored' }))
    );
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submit fired in the same tick, before React re-renders (in-flight ref)', async () => {
    mockGetScholars.mockResolvedValue({ data: [archivedScholar], pagination: emptyPagination });
    const pending = deferred();
    mockRestore.mockReturnValue(pending.promise);
    renderTable();
    await screen.findAllByText('Archived Ada');

    await openActionsMenu('Archived Ada', 'mobile');
    const item = await screen.findByRole('menuitem', { name: /restore/i });
    act(() => {
      fireEvent.click(item);
      fireEvent.click(item);
    });

    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));

    await act(async () => {
      pending.resolve({ ...archivedScholar, status: 'active' });
    });
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  });

  it('disables archive/restore/delete in both menus while in flight and re-enables after failure', async () => {
    mockGetScholars.mockResolvedValue({ data: [archivedScholar], pagination: emptyPagination });
    const pending = deferred();
    mockRestore.mockReturnValue(pending.promise);
    renderTable();
    await screen.findAllByText('Archived Ada');

    const user = await openActionsMenu('Archived Ada', 'mobile');
    await user.click(await screen.findByRole('menuitem', { name: /restore/i }));
    await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));

    await expectLifecycleItemsDisabled('Archived Ada', 'mobile', [/restore/i, /delete/i], user);
    await expectLifecycleItemsDisabled('Archived Ada', 'desktop', [/restore/i, /delete/i], user);

    await act(async () => {
      pending.reject(new Error('boom'));
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not restore scholar', description: 'boom' })
      )
    );

    // Back to usable in both menus.
    for (const kind of ['mobile', 'desktop'] as const) {
      await waitFor(async () => {
        await openActionsMenu('Archived Ada', kind, user);
        const menu = await screen.findByRole('menu');
        expect(within(menu).getByRole('menuitem', { name: /restore/i })).not.toHaveAttribute(
          'aria-disabled'
        );
        expect(within(menu).getByRole('menuitem', { name: /delete/i })).not.toHaveAttribute(
          'aria-disabled'
        );
        await user.keyboard('{Escape}');
      });
    }
  });

  it('disables Archive and Delete in both menus for an active scholar while archiving', async () => {
    mockGetScholars.mockResolvedValue({ data: [activeScholar], pagination: emptyPagination });
    const pending = deferred();
    mockArchive.mockReturnValue(pending.promise);
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = await openActionsMenu('Active Ada', 'desktop');
    await user.click(await screen.findByRole('menuitem', { name: /^archive$/i }));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledTimes(1));

    await expectLifecycleItemsDisabled('Active Ada', 'mobile', [/^archive$/i, /delete/i], user);
    await expectLifecycleItemsDisabled('Active Ada', 'desktop', [/^archive$/i, /delete/i], user);

    await act(async () => {
      pending.resolve({ ...activeScholar, status: 'archived' });
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Scholar archived' }))
    );
  });

  it('blocks a different lifecycle action while one is in flight', async () => {
    mockGetScholars.mockResolvedValue({ data: [activeScholar], pagination: emptyPagination });
    const pending = deferred();
    mockArchive.mockReturnValue(pending.promise);
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = await openActionsMenu('Active Ada', 'mobile');
    await user.click(await screen.findByRole('menuitem', { name: /^archive$/i }));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledTimes(1));

    await openActionsMenu('Active Ada', 'mobile', user);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ ...activeScholar, status: 'archived' });
    });
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  });

  it('still refetches scholars and prunes the acted-on id from the selection when the action fails', async () => {
    mockGetScholars.mockResolvedValue({
      data: [activeScholar, { ...activeScholar, id: 'scholar-other', name: 'Other Olu' }],
      pagination: { ...emptyPagination, totalItems: 2 },
    });
    mockDelete.mockRejectedValueOnce(new Error('Server exploded'));
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = userEvent.setup();
    const adaBox = screen.getByRole('checkbox', { name: 'Select Active Ada' });
    const oluBox = screen.getByRole('checkbox', { name: 'Select Other Olu' });
    await user.click(adaBox);
    await user.click(oluBox);
    expect(adaBox).toHaveAttribute('aria-checked', 'true');

    const callsBefore = mockGetScholars.mock.calls.length;
    await openActionsMenu('Active Ada', 'mobile', user);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not delete scholar',
          description: 'Server exploded',
          variant: 'destructive',
        })
      )
    );
    await waitFor(() => expect(mockGetScholars.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(alertSpy).not.toHaveBeenCalled();

    await screen.findAllByText('Active Ada');
    expect(screen.getByRole('checkbox', { name: 'Select Active Ada' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('checkbox', { name: 'Select Other Olu' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('uses toasts (not alert) for archive success and failure', async () => {
    mockGetScholars.mockResolvedValue({ data: [activeScholar], pagination: emptyPagination });
    mockArchive.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce({});
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = await openActionsMenu('Active Ada', 'mobile');
    await user.click(await screen.findByRole('menuitem', { name: /^archive$/i }));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not archive scholar',
          description: 'nope',
          variant: 'destructive',
        })
      )
    );

    await waitFor(async () => {
      await openActionsMenu('Active Ada', 'mobile', user);
      const item = await screen.findByRole('menuitem', { name: /^archive$/i });
      expect(item).not.toHaveAttribute('aria-disabled');
      await user.click(item);
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Scholar archived' }))
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does nothing when the confirm is cancelled', async () => {
    confirm.mockReturnValue(false);
    mockGetScholars.mockResolvedValue({ data: [activeScholar], pagination: emptyPagination });
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = await openActionsMenu('Active Ada', 'mobile');
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();

    // Not stuck busy after a cancel.
    await openActionsMenu('Active Ada', 'mobile', user);
    expect(await screen.findByRole('menuitem', { name: /delete/i })).not.toHaveAttribute(
      'aria-disabled'
    );
  });

  it('steps back a page when deleting the last scholar on the current page', async () => {
    let deleted = false;
    mockGetScholars.mockImplementation(async (params: { page?: number }) => {
      const page = params.page ?? 1;
      if (page === 1) {
        return {
          data: [activeScholar],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: deleted ? 1 : 21,
            totalPages: deleted ? 1 : 2,
            hasNext: !deleted,
            hasPrev: false,
          },
        };
      }
      return {
        data: deleted ? [] : [archivedScholar],
        pagination: {
          page: 2,
          limit: 20,
          totalItems: deleted ? 1 : 21,
          totalPages: deleted ? 1 : 2,
          hasNext: false,
          hasPrev: true,
        },
      };
    });
    mockDelete.mockImplementation(async () => {
      deleted = true;
      return { success: true };
    });
    renderTable();
    await screen.findAllByText('Active Ada');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findAllByText('Archived Ada');

    await openActionsMenu('Archived Ada', 'mobile', user);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    await waitFor(() => expect(calledWithIds(mockDelete)).toEqual(['scholar-archived']));
    await waitFor(() =>
      expect(mockGetScholars).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
    );
    await screen.findAllByText('Active Ada');
    expect(screen.queryByText('No scholars found')).not.toBeInTheDocument();
  });
});
