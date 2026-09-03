import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoordinatorPanel } from '../coordinator-panel';

const mockGetNotes = jest.fn();
const mockCreateNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();
const mockGetMeetings = jest.fn();
const mockCreateMeeting = jest.fn();
const mockUpdateMeeting = jest.fn();
const mockDeleteMeeting = jest.fn();
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
  getCoordinatorNotes: (...args: unknown[]) => mockGetNotes(...args),
  createCoordinatorNote: (...args: unknown[]) => mockCreateNote(...args),
  updateCoordinatorNote: (...args: unknown[]) => mockUpdateNote(...args),
  deleteCoordinatorNote: (...args: unknown[]) => mockDeleteNote(...args),
  getCoordinatorMeetingUpdates: (...args: unknown[]) => mockGetMeetings(...args),
  createCoordinatorMeetingUpdate: (...args: unknown[]) => mockCreateMeeting(...args),
  updateCoordinatorMeetingUpdate: (...args: unknown[]) => mockUpdateMeeting(...args),
  deleteCoordinatorMeetingUpdate: (...args: unknown[]) => mockDeleteMeeting(...args),
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
      <CoordinatorPanel scholarId="scholar-1" />
    </QueryClientProvider>
  );
}

describe('CoordinatorPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotes.mockResolvedValue([]);
    mockGetMeetings.mockResolvedValue([]);
  });

  it('shows one-line empty hints for notes and meetings', async () => {
    renderPanel();

    expect(await screen.findByText('No private notes yet.')).toBeInTheDocument();
    expect(screen.getByText('No meeting updates yet.')).toBeInTheDocument();
    expect(screen.getByText('Private notes')).toBeInTheDocument();
    expect(screen.getByText('Meeting log')).toBeInTheDocument();
  });

  it('renders notes and meetings and can add a note', async () => {
    const user = userEvent.setup();
    mockGetNotes.mockResolvedValue([
      {
        id: 'note-1',
        scholarId: 'scholar-1',
        body: 'Follow up on visa',
        createdBy: 'staff-1',
        authorName: 'Ada Coordinator',
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:00:00.000Z',
      },
    ]);
    mockGetMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        scholarId: 'scholar-1',
        meetingDate: '2026-09-01',
        notes: 'Weekly catch-up',
        concern: 'Late documents',
        furtherAction: 'Email reminder',
        createdBy: 'staff-1',
        authorName: 'Ada Coordinator',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
    ]);
    mockCreateNote.mockResolvedValue({
      id: 'note-2',
      scholarId: 'scholar-1',
      body: 'New private note',
      createdBy: 'staff-1',
      authorName: 'Ada Coordinator',
      createdAt: '2026-09-03T12:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
    });

    renderPanel();

    expect(await screen.findByText('Follow up on visa')).toBeInTheDocument();
    expect(screen.getAllByText(/Ada Coordinator/).length).toBeGreaterThan(0);
    expect(screen.getByText('Late documents')).toBeInTheDocument();
    expect(screen.getByText('Email reminder')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Add a note'), 'New private note');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith('scholar-1', { body: 'New private note' });
    });
  });

  it('can add a meeting with date, concern, and further action', async () => {
    const user = userEvent.setup();
    mockCreateMeeting.mockResolvedValue({
      id: 'meeting-2',
      scholarId: 'scholar-1',
      meetingDate: '2026-09-03',
      notes: null,
      concern: 'Missed deadline',
      furtherAction: 'Follow up Friday',
      createdBy: 'staff-1',
      authorName: 'Ada Coordinator',
      createdAt: '2026-09-03T12:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
    });

    renderPanel();
    await screen.findByText('No meeting updates yet.');

    await user.type(screen.getByLabelText('Date'), '2026-09-03');
    await user.type(screen.getByLabelText('Concern'), 'Missed deadline');
    await user.type(screen.getByLabelText('Further action'), 'Follow up Friday');
    await user.click(screen.getByRole('button', { name: 'Add meeting' }));

    await waitFor(() => {
      expect(mockCreateMeeting).toHaveBeenCalledWith('scholar-1', {
        meetingDate: '2026-09-03',
        concern: 'Missed deadline',
        furtherAction: 'Follow up Friday',
      });
    });
  });

  it('toasts when adding a note fails', async () => {
    const user = userEvent.setup();
    mockCreateNote.mockRejectedValue(new Error('API Error: 500'));

    renderPanel();
    await screen.findByText('No private notes yet.');

    await user.type(screen.getByLabelText('Add a note'), 'Will fail');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not save note',
          variant: 'destructive',
        })
      );
    });
  });
});
