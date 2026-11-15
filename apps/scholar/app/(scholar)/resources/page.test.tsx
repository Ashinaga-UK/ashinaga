import { fireEvent, render, screen } from '@testing-library/react';
import ResourcesPage from './page';

const mockUseMyResources = jest.fn();

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyResources: () => mockUseMyResources(),
}));

jest.mock('../../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('../../../lib/api-client', () => ({
  getResourceDownloadUrl: jest.fn(),
}));

const categories = [
  'Guides and Handbooks',
  'Workbooks',
  'Forms and Templates',
  'How-to Videos',
  'Presentations',
  'Other',
] as const;

const guide = {
  id: 'r1',
  title: 'Study Guide',
  description: 'How to study',
  type: 'Guide',
  category: 'Guides and Handbooks' as const,
  categoryReviewPending: false,
  sourceType: 'url',
  url: 'https://example.com',
  fileName: null,
  fileMimeType: null,
  fileSizeBytes: null,
};

describe('ResourcesPage', () => {
  it('renders every approved category heading', () => {
    mockUseMyResources.mockReturnValue({
      data: categories.map((category, index) => ({
        id: `resource-${index}`,
        title: `${category} resource`,
        description: 'Reference material',
        type: 'Guide',
        category,
        categoryReviewPending: false,
        sourceType: 'url',
        url: 'https://example.com',
        fileName: null,
        fileMimeType: null,
        fileSizeBytes: null,
      })),
      isLoading: false,
      error: null,
    });

    render(<ResourcesPage />);

    for (const category of categories) {
      expect(screen.getAllByText(category).length).toBeGreaterThan(0);
    }
  });

  it('keeps an unassigned resource visible without a category badge', () => {
    mockUseMyResources.mockReturnValue({
      data: [
        {
          id: 'resource-pending',
          title: 'Awaiting staff review',
          description: 'Reference material',
          type: 'Guide',
          category: null,
          categoryReviewPending: true,
          sourceType: 'url',
          url: 'https://example.com',
          fileName: null,
          fileMimeType: null,
          fileSizeBytes: null,
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<ResourcesPage />);

    expect(screen.getByText('Awaiting staff review')).toBeVisible();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });
});

describe('ResourcesPage empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows unfiltered copy without a Show all action when there are no resources', () => {
    mockUseMyResources.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<ResourcesPage />);

    expect(screen.getByText('No resources available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument();
  });

  it('shows filtered copy with a Show all action that clears the filter', () => {
    mockUseMyResources.mockReturnValue({ data: [guide], isLoading: false, error: null });

    render(<ResourcesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Handbook' }));

    expect(screen.getByText('No handbook resources')).toBeInTheDocument();
    expect(screen.queryByText('No resources available')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));

    expect(screen.getByText('Study Guide')).toBeInTheDocument();
    expect(screen.queryByText('No handbook resources')).not.toBeInTheDocument();
  });
});
