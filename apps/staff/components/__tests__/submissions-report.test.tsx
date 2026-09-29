import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmissionsReport } from '../submissions-report';

const mockGetReport = jest.fn();
const mockGetScholar = jest.fn();
const mockDownload = jest.fn();

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

jest.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

jest.mock('../ui/chart', () => ({
  ChartContainer: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));

jest.mock('../../lib/api-client', () => ({
  getSubmissionReport: (...args: unknown[]) => mockGetReport(...args),
  getScholarSubmissions: (...args: unknown[]) => mockGetScholar(...args),
  downloadSubmissionReportCSV: (...args: unknown[]) => mockDownload(...args),
}));

jest.mock('../../lib/form-data-labels', () => ({
  REQUEST_TYPE_LABELS: { others: 'Others' },
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

const pagination = {
  page: 1,
  limit: 25,
  totalItems: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const reportPayload = {
  summary: { total: 1, byKind: { request: 1, goal_update: 0, task_submission: 0 } },
  series: [{ month: '2026-03', request: 1, goal_update: 0, task_submission: 0 }],
  rows: [
    {
      id: 'request-1',
      scholarId: 'scholar-ada',
      scholarName: 'Ada Scholar',
      scholarEmail: 'ada@example.com',
      program: 'Engineering',
      year: '2026',
      kind: 'request',
      requestType: 'others',
      taskType: null,
      status: 'pending',
      occurredAt: '2026-03-02T00:00:00.000Z',
      title: 'Laptop',
    },
  ],
  pagination,
  filterOptions: { programs: ['Engineering'], years: ['2026'] },
};

function renderReport(onViewScholar = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onViewScholar,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SubmissionsReport onViewScholar={onViewScholar} />
      </QueryClientProvider>
    ),
  };
}

describe('SubmissionsReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownload.mockResolvedValue(undefined);
    mockGetScholar.mockResolvedValue({
      ...reportPayload,
      rows: [{ ...reportPayload.rows[0], id: 'goal-1', kind: 'goal_update', title: 'Read more' }],
    });
  });

  it('shows loading, then submission counts and history', async () => {
    mockGetReport.mockResolvedValue(reportPayload);
    renderReport();

    expect(screen.getByText('Loading submissions...')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ada Scholar' })).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(mockGetReport).toHaveBeenCalledWith({ page: 1, limit: 25 });
  });

  it('shows an empty hint when nothing matches', async () => {
    mockGetReport.mockResolvedValue({
      ...reportPayload,
      summary: { total: 0, byKind: { request: 0, goal_update: 0, task_submission: 0 } },
      series: [],
      rows: [],
      pagination: { ...pagination, totalItems: 0, totalPages: 0 },
    });
    renderReport();

    expect(await screen.findByText('No submissions match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('shows an inline error when the report request fails', async () => {
    mockGetReport.mockRejectedValue(new Error('nope'));
    renderReport();

    expect(await screen.findByText('Could not load submissions.')).toBeInTheDocument();
  });

  it('sends the status filter and opens one scholar history', async () => {
    mockGetReport.mockResolvedValue(reportPayload);
    const { onViewScholar } = renderReport();
    const user = userEvent.setup();

    await screen.findByRole('button', { name: 'Ada Scholar' });
    await user.selectOptions(screen.getByLabelText('Status'), 'approved');

    await waitFor(() => {
      expect(mockGetReport).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved', page: 1, limit: 25 })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Ada Scholar' }));
    expect(await screen.findByText("Ada Scholar's submissions")).toBeInTheDocument();
    expect(await screen.findByText('Read more')).toBeInTheDocument();
    expect(mockGetScholar).toHaveBeenCalledWith(
      'scholar-ada',
      expect.objectContaining({ page: 1, limit: 25 })
    );

    await user.click(screen.getByRole('button', { name: 'Open profile' }));
    expect(onViewScholar).toHaveBeenCalledWith('scholar-ada', 'profile');
  });
});
