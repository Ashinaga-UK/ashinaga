import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrepTasksTracker } from '../prep-tasks-tracker';

const mockGetCohort = jest.fn();

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
  getPrepTaskCohort: (...args: unknown[]) => mockGetCohort(...args),
}));

jest.mock('../bulk-task-assignment', () => ({
  BulkTaskAssignment: ({ trigger }: { trigger: unknown }) => trigger,
}));

jest.mock('../ui/select', () => {
  const React = require('react');
  function collect(
    nodes: unknown,
    acc: { label: string; options: Array<{ value: string; label: unknown }> }
  ) {
    React.Children.forEach(nodes, (child: unknown) => {
      if (!React.isValidElement(child)) return;
      if (typeof child.props['aria-label'] === 'string') {
        acc.label = child.props['aria-label'];
      }
      if (typeof child.props.value === 'string' && child.props.children != null) {
        acc.options.push({ value: child.props.value, label: child.props.children });
      }
      if (child.props.children) collect(child.props.children, acc);
    });
    return acc;
  }
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (next: string) => void;
      children: unknown;
    }) => {
      const collected = collect(children, { label: 'select', options: [] });
      const options = collected.options.filter(
        (option, index, all) => all.findIndex((entry) => entry.value === option.value) === index
      );
      return (
        <select
          aria-label={collected.label}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: unknown }) => children,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: unknown }) => children,
    SelectItem: ({ children }: { children: unknown }) => children,
  };
});

const cohortPayload = {
  columns: [
    {
      key: 'group-1',
      title: 'Connect signup',
      phase: 'english',
      dueDate: '2026-10-01T00:00:00.000Z',
      assignmentGroupId: 'group-1',
      requiresResponse: false,
      requiresAttachment: false,
      requiresLink: false,
    },
  ],
  scholars: [
    {
      scholarId: 's1',
      name: 'Ada Candidate',
      email: 'ada@example.com',
      status: 'active',
      cells: [
        {
          columnKey: 'group-1',
          taskId: 't1',
          status: 'pending',
          overdue: true,
          completedAt: null,
        },
      ],
    },
    {
      scholarId: 's2',
      name: 'Ben Candidate',
      email: 'ben@example.com',
      status: 'on_hold',
      cells: [
        {
          columnKey: 'group-1',
          taskId: 't2',
          status: 'completed',
          overdue: false,
          completedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    },
  ],
  summary: { scholarCount: 2, columnCount: 1, overdueCount: 1, completedCount: 1 },
  filterOptions: {
    phases: ['english'],
    columns: [{ key: 'group-1', title: 'Connect signup', phase: 'english' }],
    scholars: [
      { scholarId: 's1', name: 'Ada Candidate' },
      { scholarId: 's2', name: 'Ben Candidate' },
    ],
  },
};

function renderTracker(onViewScholar = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onViewScholar,
    ...render(
      <QueryClientProvider client={queryClient}>
        <PrepTasksTracker onViewScholar={onViewScholar} />
      </QueryClientProvider>
    ),
  };
}

describe('PrepTasksTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading then the cohort matrix', async () => {
    mockGetCohort.mockResolvedValue(cohortPayload);
    renderTracker();

    expect(screen.getByText('Loading Prep Year tasks...')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ada Candidate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ben Candidate' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('On hold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign to Prep Year cohort' })).toBeInTheDocument();
    expect(screen.getAllByText('Not started').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(mockGetCohort).toHaveBeenCalledWith({});
  });

  it('shows an empty hint when there are no prep year candidates', async () => {
    mockGetCohort.mockResolvedValue({
      columns: [],
      scholars: [],
      summary: { scholarCount: 0, columnCount: 0, overdueCount: 0, completedCount: 0 },
      filterOptions: { phases: [], columns: [], scholars: [] },
    });
    renderTracker();
    expect(await screen.findByText('No Prep Year candidates yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign to Prep Year cohort' })).toBeInTheDocument();
  });

  it('shows the no-tasks empty state when candidates exist but there are no columns', async () => {
    mockGetCohort.mockResolvedValue({
      columns: [],
      scholars: [
        {
          scholarId: 's1',
          name: 'Ada Candidate',
          email: 'ada@example.com',
          status: 'active',
          cells: [],
        },
      ],
      summary: { scholarCount: 1, columnCount: 0, overdueCount: 0, completedCount: 0 },
      filterOptions: {
        phases: [],
        columns: [],
        scholars: [{ scholarId: 's1', name: 'Ada Candidate' }],
      },
    });
    renderTracker();
    expect(
      await screen.findByText('No tasks have been assigned to the Prep Year cohort yet.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ada Candidate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign to Prep Year cohort' })).toBeInTheDocument();
  });

  it('shows an inline error when the cohort request fails', async () => {
    mockGetCohort.mockRejectedValue(new Error('nope'));
    renderTracker();
    expect(await screen.findByText('Could not load the task tracker.')).toBeInTheDocument();
  });

  it('refetches with query filters when the state select changes', async () => {
    mockGetCohort.mockResolvedValue(cohortPayload);
    const user = userEvent.setup();
    renderTracker();
    await screen.findByRole('button', { name: 'Ada Candidate' });

    await user.selectOptions(screen.getByLabelText('Filter by state'), 'overdue');

    await waitFor(() => {
      expect(mockGetCohort).toHaveBeenCalledWith({ state: 'overdue' });
    });
  });

  it('calls onViewScholar when a candidate name is clicked', async () => {
    mockGetCohort.mockResolvedValue(cohortPayload);
    const user = userEvent.setup();
    const { onViewScholar } = renderTracker();
    await user.click(await screen.findByRole('button', { name: 'Ada Candidate' }));
    expect(onViewScholar).toHaveBeenCalledWith('s1');
  });
});
