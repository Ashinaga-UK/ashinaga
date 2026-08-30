import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { PrepDocumentsTracker } from '../prep-documents-tracker';

const mockGetCohort = jest.fn();
const mockGetTypes = jest.fn();

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
  getRequiredDocumentCohort: (...args: unknown[]) => mockGetCohort(...args),
  getRequiredDocumentTypes: (...args: unknown[]) => mockGetTypes(...args),
  createRequiredDocumentType: jest.fn(),
  updateRequiredDocumentType: jest.fn(),
  getRequiredDocumentDownloadUrl: jest.fn(),
}));

function renderTracker() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PrepDocumentsTracker onViewScholar={jest.fn()} />
    </QueryClientProvider>
  );
}

describe('PrepDocumentsTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTypes.mockResolvedValue([
      {
        id: 'type-1',
        slug: 'passport',
        label: 'Passport copy',
        description: null,
        isActive: true,
        sortOrder: 1,
      },
    ]);
  });

  it('shows missing and submitted cells for the prep cohort', async () => {
    mockGetCohort.mockResolvedValue({
      types: [
        {
          id: 'type-1',
          slug: 'passport',
          label: 'Passport copy',
          description: null,
          isActive: true,
          sortOrder: 1,
        },
      ],
      scholars: [
        {
          scholarId: 's1',
          name: 'Ada Candidate',
          email: 'ada@example.com',
          items: [{ typeId: 'type-1', status: 'missing', file: null }],
        },
        {
          scholarId: 's2',
          name: 'Ben Candidate',
          email: 'ben@example.com',
          items: [
            {
              typeId: 'type-1',
              status: 'submitted',
              file: { id: 'f1', fileName: 'passport.pdf', uploadedAt: '2026-08-01T00:00:00.000Z' },
            },
          ],
        },
      ],
    });

    renderTracker();

    expect(await screen.findByText('Ada Candidate')).toBeInTheDocument();
    expect(screen.getByText('Ben Candidate')).toBeInTheDocument();
    expect(screen.getAllByText('Missing').length).toBeGreaterThan(0);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(
      screen.getByText(
        `passport.pdf · ${new Date('2026-08-01T00:00:00.000Z').toLocaleDateString()}`
      )
    ).toBeInTheDocument();
  });
});
