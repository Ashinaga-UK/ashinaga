import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScholarActivityReport } from '../scholar-activity-report';

const mockGetReport = jest.fn();
const mockDownloadCsv = jest.fn();

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
  getScholarActivityReport: (...args: unknown[]) => mockGetReport(...args),
  downloadScholarActivityReportCSV: (...args: unknown[]) => mockDownloadCsv(...args),
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

const reportPayload = {
  summary: {
    scholarCount: 2,
    staleLoginCount: 1,
    unknownLoginCount: 1,
    scholarsBehindOnTasks: 1,
    avgTaskCompletionRate: 50,
  },
  cohorts: [
    {
      program: 'Law',
      year: '2026',
      scholarCount: 2,
      staleLoginCount: 1,
      unknownLoginCount: 1,
      scholarsBehindOnTasks: 1,
      avgTaskCompletionRate: 50,
    },
  ],
  scholars: [
    {
      scholarId: 's1',
      name: 'Ada Scholar',
      email: 'ada@example.com',
      status: 'active',
      program: 'Law',
      year: '2026',
      programStage: 'scholar',
      nationality: 'Uganda',
      lastActivity: '2026-07-01T00:00:00.000Z',
      daysSinceActivity: 90,
      lastActivityUnknown: false,
      isStaleLogin: true,
      tasksAssigned: 2,
      tasksCompleted: 1,
      tasksCompletedInRange: 1,
      tasksBehind: 1,
      taskCompletionRate: 50,
      goalsTotal: 1,
      goalsCompleted: 0,
      goalsUpdatedInRange: 1,
      avgCompletionScale: 4,
    },
    {
      scholarId: 's2',
      name: 'Ben Scholar',
      email: 'ben@example.com',
      status: 'active',
      program: 'Law',
      year: '2026',
      programStage: 'prep_year',
      nationality: null,
      lastActivity: null,
      daysSinceActivity: null,
      lastActivityUnknown: true,
      isStaleLogin: false,
      tasksAssigned: 0,
      tasksCompleted: 0,
      tasksCompletedInRange: 0,
      tasksBehind: 0,
      taskCompletionRate: null,
      goalsTotal: 0,
      goalsCompleted: 0,
      goalsUpdatedInRange: 0,
      avgCompletionScale: null,
    },
  ],
  filterOptions: {
    programs: ['Law'],
    years: ['2026'],
    nationalities: ['Uganda'],
    statuses: ['active', 'inactive', 'on_hold', 'archived'],
  },
};

function renderReport(onViewScholar = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onViewScholar,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ScholarActivityReport onViewScholar={onViewScholar} />
      </QueryClientProvider>
    ),
  };
}

describe('ScholarActivityReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadCsv.mockResolvedValue(undefined);
    mockGetReport.mockResolvedValue(reportPayload);
  });

  it('shows stale and unknown activity, cohort totals, and exports the current filter', async () => {
    const { onViewScholar } = renderReport();

    expect(await screen.findByRole('button', { name: 'Ada Scholar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ben Scholar' })).toBeInTheDocument();
    expect(screen.getAllByText('No activity in 30 days').length).toBeGreaterThan(0);
    expect(screen.getByText('Activity unknown')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);

    const tables = screen.getAllByRole('table');
    const cohortTable = tables[0];
    const scholarTable = tables[1];
    if (!cohortTable || !scholarTable) throw new Error('Expected cohort and scholar tables');
    expect(within(cohortTable).getByText('Law')).toBeInTheDocument();
    expect(within(scholarTable).getByText('50%')).toBeInTheDocument();
    expect(within(scholarTable).getByText('1/2')).toBeInTheDocument();
    expect(screen.getByLabelText('From (UTC)')).toBeInTheDocument();
    expect(screen.getByLabelText('To (UTC)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ada Scholar' }));
    expect(onViewScholar).toHaveBeenCalledWith('s1');

    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(mockDownloadCsv).toHaveBeenCalledWith({ status: 'active' });
    expect(mockGetReport).toHaveBeenCalledWith({ status: 'active' });
  });
});
