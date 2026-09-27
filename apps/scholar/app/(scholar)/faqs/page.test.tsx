import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import FaqsPage from './page';

const mockGetMyFaqs = jest.fn();

jest.mock('../../../lib/api-client', () => ({
  getMyFaqs: (...args: unknown[]) => mockGetMyFaqs(...args),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FaqsPage />
    </QueryClientProvider>
  );
}

describe('FaqsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyFaqs.mockResolvedValue([]);
  });

  it('renders the FAQs route', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'FAQs' })).toBeInTheDocument();
    expect(
      await screen.findByText('Frequently asked questions will appear here.')
    ).toBeInTheDocument();
  });
});
