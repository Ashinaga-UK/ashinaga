import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  FAQ_UNCATEGORIZED_FILTER,
  FAQ_UNCATEGORIZED_LABEL,
  FaqManagement,
  faqCategoryOptions,
} from '../faq-management';

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

describe('faqCategoryOptions', () => {
  it('uses a distinct key for uncategorized so a real General category does not collide', () => {
    expect(
      faqCategoryOptions([
        { category: 'General' },
        { category: null },
        { category: 'Documents' },
      ])
    ).toEqual([
      { value: 'General', label: 'General' },
      { value: 'Documents', label: 'Documents' },
      { value: FAQ_UNCATEGORIZED_FILTER, label: FAQ_UNCATEGORIZED_LABEL },
    ]);
  });
});

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

  it('filters uncategorized items separately from a real General category', async () => {
    mockGetFaqs.mockResolvedValue([
      { ...prepFaq, id: 'faq-general', category: 'General', question: 'What is General?' },
      { ...prepFaq, id: 'faq-none', category: null, question: 'How do I start?' },
      tasksFaq,
    ]);

    renderEditor();

    expect(await screen.findByText('What is General?')).toBeInTheDocument();
    expect(screen.getByText('How do I start?')).toBeInTheDocument();

    const generalButtons = screen.getAllByRole('button', { name: 'General' });
    expect(generalButtons).toHaveLength(2);

    fireEvent.click(generalButtons[0]);
    expect(screen.getByText('What is General?')).toBeInTheDocument();
    expect(screen.queryByText('How do I start?')).not.toBeInTheDocument();

    fireEvent.click(generalButtons[1]);
    expect(screen.getByText('How do I start?')).toBeInTheDocument();
    expect(screen.queryByText('What is General?')).not.toBeInTheDocument();
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
