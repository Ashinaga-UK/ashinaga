import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OverviewPayload } from '../../lib/api-client';
import { OverviewDashboard } from '../overview-dashboard';

const replace = jest.fn();
let attention: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: (...args: unknown[]) => replace(...args) }),
  useSearchParams: () => new URLSearchParams(attention ? `attention=${attention}` : ''),
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

jest.mock('../proposal-inbox', () => ({
  ProposalInbox: () => <div>Proposal reviews</div>,
}));

jest.mock('../task-assignment', () => ({
  TaskAssignment: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

jest.mock('../staff-invite-dialog', () => ({
  StaffInviteDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const overview = jest.fn();

jest.mock('../../lib/hooks/use-queries', () => ({
  useOverview: () => overview(),
}));

const payload: OverviewPayload = {
  cohort: { total: 128, prepYear: 14 },
  followUpDays: 14,
  attention: {
    total: 2,
    truncated: false,
    counts: { action: 1, follow: 1, prep: 0, reviews: 0 },
    items: [
      {
        id: 'overdue_task:1',
        type: 'overdue_task',
        title: 'Personal statement draft',
        scholarName: 'Amina Diallo',
        scholarId: 's-1',
        href: '/?tab=scholars&view=scholar-profile&scholarId=s-1&scholarTab=tasks',
        meta: { dueDate: '2026-09-23T00:00:00.000Z', daysOverdue: 6 },
      },
      {
        id: 'stale_scholar:2',
        type: 'stale_scholar',
        title: 'No activity for 21 days',
        scholarName: 'David Kariuki',
        scholarId: 's-2',
        href: '/?tab=scholars&view=scholar-profile&scholarId=s-2',
        meta: { lastActivity: '2026-09-08T00:00:00.000Z', daysInactive: 21 },
      },
    ],
  },
  prepYear: {
    candidateCount: 14,
    total: 1,
    truncated: false,
    gaps: [
      {
        id: 'documents:s-prep',
        kind: 'documents',
        title: 'Passport and IELTS missing',
        scholarName: 'Hannah Bekele',
        scholarId: 's-prep',
        href: '/?tab=scholars&view=scholar-profile&scholarId=s-prep&scholarTab=documents',
      },
      {
        id: 'platforms:s-prep',
        kind: 'platforms',
        title: 'Coursera still pending',
        scholarName: 'Hannah Bekele',
        scholarId: 's-prep',
        href: '/?tab=scholars&view=scholar-profile&scholarId=s-prep',
      },
    ],
  },
};

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OverviewDashboard />
    </QueryClientProvider>
  );
}

describe('OverviewDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    attention = null;
    overview.mockReturnValue({
      data: payload,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
    });
  });

  it('renders cohort figures, an attention row link, and the Prep Year snapshot', () => {
    renderDashboard();

    expect(screen.getByRole('link', { name: /^Scholars/ })).toHaveTextContent('128');
    expect(screen.getByRole('link', { name: /^Scholars/ })).toHaveTextContent('scholars');
    expect(screen.getByRole('link', { name: /^Scholars/ })).toHaveAttribute(
      'href',
      '/?tab=scholars&programStage=scholar'
    );
    expect(screen.getByRole('link', { name: /Prep Year/ })).toHaveTextContent('14');
    expect(screen.getByRole('link', { name: /Prep Year/ })).toHaveAttribute(
      'href',
      '/?tab=scholars&programStage=prep_year'
    );
    expect(screen.getByRole('link', { name: /^Scholars/ })).not.toHaveTextContent('active');
    expect(screen.getByRole('link', { name: /Personal statement draft/ })).toHaveAttribute(
      'href',
      payload.attention.items[0]?.href
    );
    expect(screen.getByRole('link', { name: /Onboard Scholar/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review Requests/ })).toBeInTheDocument();
    expect(screen.getByText('Proposal reviews')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View full report' })).toHaveAttribute(
      'href',
      '/?tab=prep-reports'
    );
    expect(screen.getByRole('link', { name: /Passport and IELTS missing/ })).toHaveAttribute(
      'href',
      '/?tab=scholars&view=scholar-profile&scholarId=s-prep&scholarTab=documents'
    );
    expect(screen.getAllByText('Hannah Bekele')).toHaveLength(1);
    expect(screen.getByText('2 gaps')).toBeInTheDocument();
  });

  it('states the follow-up window from the overview payload', () => {
    attention = 'follow';
    overview.mockReturnValue({
      data: { ...payload, followUpDays: 21 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
    });

    renderDashboard();

    expect(screen.getByText(/quiet for more than 21 days/)).toBeInTheDocument();
  });

  it('shows the follow-up row when that view is selected', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('tab', { name: /Follow up/ }));

    expect(replace).toHaveBeenCalledWith(expect.stringContaining('attention=follow'));
  });

  it('hides Prep Year when the cohort snapshot is empty and shows the empty attention state', () => {
    overview.mockReturnValue({
      data: {
        ...payload,
        attention: {
          items: [],
          total: 0,
          truncated: false,
          counts: { action: 0, follow: 0, prep: 0, reviews: 0 },
        },
        prepYear: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
    });

    renderDashboard();

    expect(screen.getByText('Nothing needs you right now.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View full report' })).not.toBeInTheDocument();
  });

  it('shows a per-section error with a retry', async () => {
    const refetch = jest.fn();
    overview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network down'),
      refetch,
      isFetching: false,
    });
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.getByText('Couldn’t load what needs attention')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
