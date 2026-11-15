import { fireEvent, render, screen } from '@testing-library/react';

const mockUseMyResources = jest.fn();

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyResources: () => mockUseMyResources(),
}));

jest.mock('../../../lib/api-client', () => ({
  getResourceDownloadUrl: jest.fn(),
}));

import ResourcesPage from './page';

const guide = {
  id: 'r1',
  title: 'Study Guide',
  description: 'How to study',
  type: 'Guide',
  category: 'Support',
  sourceType: 'url',
  url: 'https://example.com',
};

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
