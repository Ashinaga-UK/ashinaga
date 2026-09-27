import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FaqManagement } from '../faq-management';

const mockGetFaqs = jest.fn();
const mockCreateFaq = jest.fn();
const mockUpdateFaq = jest.fn();
const mockDeleteFaq = jest.fn();
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
  getFaqs: (...args: unknown[]) => mockGetFaqs(...args),
  createFaq: (...args: unknown[]) => mockCreateFaq(...args),
  updateFaq: (...args: unknown[]) => mockUpdateFaq(...args),
  deleteFaq: (...args: unknown[]) => mockDeleteFaq(...args),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const prepFaq = {
  id: 'faq-1',
  audience: 'prep_year' as const,
  category: 'Documents',
  question: 'Which documents do I upload?',
  answer: 'Use My Documents.',
  sortOrder: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const tasksFaq = {
  ...prepFaq,
  id: 'faq-2',
  category: 'Tasks',
  question: 'Where are my tasks?',
  answer: 'Open My Tasks.',
};

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FaqManagement />
    </QueryClientProvider>
  );
}

describe('FaqManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFaqs.mockResolvedValue([prepFaq]);
  });

  it('lists existing FAQs', async () => {
    renderEditor();

    expect(await screen.findByText('Which documents do I upload?')).toBeInTheDocument();
    expect(screen.getByText('Use My Documents.')).toBeInTheDocument();
    expect(screen.getByText('Prep Year')).toBeInTheDocument();
  });

  it('filters the list with category bubbles', async () => {
    mockGetFaqs.mockResolvedValue([prepFaq, tasksFaq]);

    renderEditor();

    expect(await screen.findByText('Which documents do I upload?')).toBeInTheDocument();
    expect(screen.getByText('Where are my tasks?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));

    expect(screen.getByText('Where are my tasks?')).toBeInTheDocument();
    expect(screen.queryByText('Which documents do I upload?')).not.toBeInTheDocument();
  });

  it('creates a FAQ from the editor', async () => {
    mockCreateFaq.mockResolvedValue({
      ...prepFaq,
      id: 'faq-2',
      question: 'How do I start platform setup?',
      answer: 'Open My Documents and follow the listed platforms.',
    });

    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Add FAQ' }));
    fireEvent.change(screen.getByLabelText('Category (optional)'), {
      target: { value: 'Platform setup' },
    });
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'How do I start platform setup?' },
    });
    fireEvent.change(screen.getByLabelText('Answer'), {
      target: { value: 'Open My Documents and follow the listed platforms.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add FAQ' }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(mockCreateFaq).toHaveBeenCalledWith({
        audience: 'prep_year',
        category: 'Platform setup',
        question: 'How do I start platform setup?',
        answer: 'Open My Documents and follow the listed platforms.',
        sortOrder: 0,
      });
    });
  });
});
