import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrepCohortReport } from '../prep-cohort-report';

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
  getPrepYearReport: (...args: unknown[]) => mockGetReport(...args),
  downloadPrepYearReportCSV: (...args: unknown[]) => mockDownloadCsv(...args),
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
  documentTypes: [{ id: 'type-ielts', slug: 'ielts', label: 'IELTS results' }],
  platforms: [{ id: 'plat-coursera', slug: 'coursera', name: 'Coursera' }],
  scholars: [
    {
      scholarId: 's1',
      name: 'Ada Candidate',
      email: 'ada@example.com',
      status: 'active',
      intendedUniversity: 'Oxford',
      intendedCourse: 'Law',
      degreePathway: 'Foundation Year',
      assignedCount: 2,
      completedCount: 1,
      overdueCount: 1,
      completionRate: 50,
      documents: { 'type-ielts': 'submitted' },
      platforms: { 'plat-coursera': 'yes' },
    },
    {
      scholarId: 's2',
      name: 'Ben Candidate',
      email: 'ben@example.com',
      status: 'on_hold',
      intendedUniversity: null,
      intendedCourse: null,
      degreePathway: null,
      assignedCount: 0,
      completedCount: 0,
      overdueCount: 0,
      completionRate: null,
      documents: { 'type-ielts': 'missing' },
      platforms: { 'plat-coursera': 'pending' },
    },
  ],
  summary: { scholarCount: 2, overdueCount: 1, missingDocumentCount: 1, completedTaskCount: 1 },
  filterOptions: {
    phases: ['english'],
    scholars: [
      { scholarId: 's1', name: 'Ada Candidate' },
      { scholarId: 's2', name: 'Ben Candidate' },
    ],
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
        <PrepCohortReport onViewScholar={onViewScholar} />
      </QueryClientProvider>
    ),
  };
}

describe('PrepCohortReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadCsv.mockResolvedValue(undefined);
  });

  it('shows loading then the cohort overview', async () => {
    mockGetReport.mockResolvedValue(reportPayload);
    renderReport();

    expect(screen.getByText('Loading Prep Year report...')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ada Candidate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ben Candidate' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Oxford')).toBeInTheDocument();
    expect(within(table).getByText('50%')).toBeInTheDocument();
    expect(within(table).getByText('Submitted')).toBeInTheDocument();
    expect(within(table).getByText('Missing')).toBeInTheDocument();
    expect(within(table).getByText('Yes')).toBeInTheDocument();
    expect(within(table).getByText('Pending')).toBeInTheDocument();
    expect(mockGetReport).toHaveBeenCalledWith({});
  });

  it('shows an empty hint when there are no prep year candidates', async () => {
    mockGetReport.mockResolvedValue({
      documentTypes: [],
      platforms: [],
      scholars: [],
      summary: { scholarCount: 0, overdueCount: 0, missingDocumentCount: 0, completedTaskCount: 0 },
      filterOptions: { phases: [], scholars: [] },
    });
    renderReport();
    expect(await screen.findByText('No Prep Year candidates yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('shows an inline error when the report request fails', async () => {
    mockGetReport.mockRejectedValue(new Error('nope'));
    renderReport();
    expect(await screen.findByText('Could not load the cohort report.')).toBeInTheDocument();
  });

  it('does not keep the previous cohort on screen while a filter refetch is in flight', async () => {
    mockGetReport
      .mockResolvedValueOnce(reportPayload)
      .mockImplementationOnce(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderReport();
    await screen.findByRole('button', { name: 'Ada Candidate' });

    await user.selectOptions(screen.getByLabelText('Filter by candidate'), 's1');

    expect(await screen.findByText('Loading Prep Year report...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ada Candidate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('scopes print chrome to the report and does not set a global @page', () => {
    const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');
    expect(css).not.toMatch(/@page/);
    expect(css).toContain('body.prep-report-printing header');
  });

  it('refetches with query filters and exports CSV with the same params', async () => {
    mockGetReport.mockResolvedValue(reportPayload);
    const user = userEvent.setup();
    renderReport();
    await screen.findByRole('button', { name: 'Ada Candidate' });

    await user.selectOptions(screen.getByLabelText('Filter by candidate'), 's1');
    await waitFor(() => {
      expect(mockGetReport).toHaveBeenCalledWith({ scholarId: 's1' });
    });
    await screen.findByRole('button', { name: 'Ada Candidate' });

    await user.selectOptions(screen.getByLabelText('Filter by phase'), 'english');
    await waitFor(() => {
      expect(mockGetReport).toHaveBeenCalledWith({ scholarId: 's1', phase: 'english' });
    });
    await screen.findByRole('button', { name: 'Ada Candidate' });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => {
      expect(mockDownloadCsv).toHaveBeenCalledWith({ scholarId: 's1', phase: 'english' });
    });
  });

  it('prints the current report', async () => {
    mockGetReport.mockResolvedValue(reportPayload);
    const print = jest.spyOn(window, 'print').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderReport();
    await screen.findByRole('button', { name: 'Ada Candidate' });
    await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));
    expect(print).toHaveBeenCalled();
    expect(document.body.classList.contains('prep-report-printing')).toBe(true);
    expect(document.getElementById('prep-report-page-style')?.textContent).toContain(
      'size: A4 landscape'
    );
    const printed = screen.getByTestId('prep-report-print');
    expect(printed).toHaveTextContent('Ada Candidate');
    expect(printed).toHaveTextContent('Intended university');
    expect(printed).toHaveTextContent('Oxford');
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('prep-report-printing')).toBe(false);
    expect(document.getElementById('prep-report-page-style')).toBeNull();
    print.mockRestore();
  });
});
