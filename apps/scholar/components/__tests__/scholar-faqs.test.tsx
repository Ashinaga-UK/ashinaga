import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Faq } from '../../lib/api-client';
import { groupFaqsByCategory, ScholarFaqs } from '../scholar-faqs';

const mockGetMyFaqs = jest.fn();
const mockScholarSession = {
  profile: { programStage: 'prep_year' as const },
  programStage: 'prep_year' as const,
  profileStatus: 'ready' as const,
  refreshProfile: jest.fn(),
  applyProfile: jest.fn(),
};

jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement('svg', props);
  return {
    AlertCircle: Icon,
    ChevronDown: Icon,
    HelpCircle: Icon,
    Loader2: Icon,
  };
});

jest.mock('../../lib/api-client', () => ({
  getMyFaqs: (...args: unknown[]) => mockGetMyFaqs(...args),
}));

jest.mock('../../lib/scholar-session', () => ({
  useScholarSession: () => mockScholarSession,
}));

const prepFaq: Faq = {
  id: 'faq-prep-1',
  audience: 'prep_year',
  category: 'Documents',
  question: 'Which documents do I upload?',
  answer: 'Upload required documents from My Documents.',
  sortOrder: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const scholarFaq: Faq = {
  id: 'faq-scholar-1',
  audience: 'scholar',
  category: 'Annual review',
  question: 'When is the annual review due?',
  answer: 'Check Announcements for the deadline.',
  sortOrder: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function renderFaqs() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScholarFaqs />
    </QueryClientProvider>
  );
}

describe('groupFaqsByCategory', () => {
  it('keeps first-seen category order and isolates ungrouped items', () => {
    expect(
      groupFaqsByCategory([
        prepFaq,
        { ...prepFaq, id: 'faq-2', category: null, question: 'How do I start?' },
        { ...prepFaq, id: 'faq-3', category: 'Tasks', question: 'Where are my tasks?' },
      ])
    ).toEqual([
      { category: 'Documents', items: [prepFaq] },
      {
        category: null,
        items: [{ ...prepFaq, id: 'faq-2', category: null, question: 'How do I start?' }],
      },
      {
        category: 'Tasks',
        items: [{ ...prepFaq, id: 'faq-3', category: 'Tasks', question: 'Where are my tasks?' }],
      },
    ]);
  });
});

describe('ScholarFaqs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScholarSession.programStage = 'prep_year';
    mockScholarSession.profileStatus = 'ready';
    mockScholarSession.profile = { programStage: 'prep_year' };
  });

  it('shows a calm placeholder when no FAQs are published', async () => {
    mockGetMyFaqs.mockResolvedValue([]);

    renderFaqs();

    expect(
      await screen.findByText('Frequently asked questions will appear here.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask|submit|message|contact/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders only FAQs for the current programme stage from a mixed list', async () => {
    mockGetMyFaqs.mockResolvedValue([prepFaq, scholarFaq]);

    renderFaqs();

    expect(await screen.findByText('Which documents do I upload?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.queryByText(scholarFaq.question)).not.toBeInTheDocument();
    expect(screen.queryByText(scholarFaq.answer)).not.toBeInTheDocument();
  });

  it('renders only Scholar FAQs for an enrolled scholar', async () => {
    mockScholarSession.programStage = 'scholar';
    mockScholarSession.profile = { programStage: 'scholar' };
    mockGetMyFaqs.mockResolvedValue([prepFaq, scholarFaq]);

    renderFaqs();

    expect(await screen.findByText(scholarFaq.question)).toBeInTheDocument();
    expect(screen.queryByText(prepFaq.question)).not.toBeInTheDocument();
  });

  it('filters questions with category bubbles', async () => {
    const user = userEvent.setup();
    mockGetMyFaqs.mockResolvedValue([
      prepFaq,
      { ...prepFaq, id: 'faq-tasks', category: 'Tasks', question: 'Where are my tasks?' },
    ]);

    renderFaqs();

    expect(await screen.findByText('Which documents do I upload?')).toBeInTheDocument();
    expect(screen.getByText('Where are my tasks?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tasks' }));

    expect(screen.getByText('Where are my tasks?')).toBeInTheDocument();
    expect(screen.queryByText('Which documents do I upload?')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Which documents do I upload?')).toBeInTheDocument();
  });

  it('expands an answer without offering a write action', async () => {
    const user = userEvent.setup();
    mockGetMyFaqs.mockResolvedValue([prepFaq]);

    renderFaqs();

    await user.click(await screen.findByRole('button', { name: prepFaq.question }));

    expect(screen.getByText(prepFaq.answer)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask|submit|send|message/i })
    ).not.toBeInTheDocument();
  });
});
