import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskAssignment } from '../task-assignment';

const mockGetAllActiveScholars = jest.fn();
const mockCreateTask = jest.fn();
const mockCreateBulkTasks = jest.fn();
const mockGetTaskTitleSuggestions = jest.fn();
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
  getAllActiveScholars: (...args: unknown[]) => mockGetAllActiveScholars(...args),
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  createBulkTasks: (...args: unknown[]) => mockCreateBulkTasks(...args),
  getTaskTitleSuggestions: (...args: unknown[]) => mockGetTaskTitleSuggestions(...args),
}));

jest.mock('../../lib/hooks/use-queries', () => ({
  useCreateTask: () => ({
    mutate: mockCreateTask,
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function scholar(id: string, name: string, programStage: 'prep_year' | 'scholar') {
  return {
    id,
    userId: `user-${id}`,
    name,
    email: `${id}@example.com`,
    program: 'Computer Science',
    year: 'Year 1',
    university: 'Test University',
    status: 'active',
    programStage,
    startDate: '2024-09-01T00:00:00.000Z',
    goals: { total: 0, completed: 0, inProgress: 0, pending: 0 },
    tasks: { total: 0, completed: 0, overdue: 0, dueToday: 0 },
    createdAt: '2024-09-01T00:00:00.000Z',
    updatedAt: '2024-09-01T00:00:00.000Z',
  };
}

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskAssignment />
    </QueryClientProvider>
  );
}

describe('TaskAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllActiveScholars.mockResolvedValue([
      scholar('s1', 'Ada Enrolled', 'scholar'),
      scholar('s2', 'Ben Prep', 'prep_year'),
    ]);
    mockGetTaskTitleSuggestions.mockResolvedValue([]);
    mockCreateBulkTasks.mockResolvedValue({ created: 2, tasks: [] });
  });

  it('lets staff pick enrolled and Prep Year scholars together', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Assign Task' }));
    expect(
      await screen.findByText(
        'Choose one or more people. Prep Year candidates and enrolled scholars can both receive this task.'
      )
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Select all' }));
    expect(screen.getByRole('checkbox', { name: 'Select Ada Enrolled' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Ben Prep' })).toBeChecked();
    await user.type(screen.getByLabelText('Task Title *'), 'Write essay');
    await user.type(screen.getByLabelText('Task Description *'), 'Please submit the draft.');
    await user.type(screen.getByLabelText('Due Date'), '2026-10-01');

    await user.click(screen.getByRole('button', { name: 'Assign to 2 scholars' }));

    expect(mockCreateBulkTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Write essay',
        scholarIds: ['s1', 's2'],
      })
    );
  });
});
