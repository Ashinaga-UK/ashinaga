import { render, screen } from '@testing-library/react';
import ResourcesPage from './page';

const mockUseMyResources = jest.fn();

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyResources: () => mockUseMyResources(),
}));

jest.mock('../../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const categories = [
  'Guides and Handbooks',
  'Workbooks',
  'Forms and Templates',
  'How-to Videos',
  'Presentations',
  'Other',
] as const;

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
