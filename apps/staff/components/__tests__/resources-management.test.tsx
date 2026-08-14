import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResourcesManagement } from '../resources-management';

const mockGetResources = jest.fn();
const mockGetResourceFilterOptions = jest.fn();
const mockUpdateResource = jest.fn();
const mockCreateResource = jest.fn();
const mockDeleteResource = jest.fn();
const mockToast = jest.fn();

jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement('svg', props);
  return {
    BookOpen: Icon,
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    Edit: Icon,
    ExternalLink: Icon,
    FileText: Icon,
    GraduationCap: Icon,
    Library: Icon,
    Loader2: Icon,
    Search: Icon,
    Trash2: Icon,
    X: Icon,
  };
});

jest.mock('../../lib/api-client', () => ({
  getResources: (...args: unknown[]) => mockGetResources(...args),
  getResourceFilterOptions: (...args: unknown[]) => mockGetResourceFilterOptions(...args),
  updateResource: (...args: unknown[]) => mockUpdateResource(...args),
  createResource: (...args: unknown[]) => mockCreateResource(...args),
  deleteResource: (...args: unknown[]) => mockDeleteResource(...args),
}));

jest.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const resource = {
  id: 'resource-1',
  title: 'Original title',
  description: 'Original description',
  type: 'Guide' as const,
  category: 'Support' as const,
  url: 'https://example.com/resource',
  sourceType: 'url' as const,
  fileName: null,
  fileMimeType: null,
  fileSizeBytes: null,
  status: 'live' as const,
  filters: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function renderResources() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ResourcesManagement />
      </QueryClientProvider>
    ),
    queryClient,
  };
}

describe('ResourcesManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetResources.mockResolvedValue([resource]);
    mockGetResourceFilterOptions.mockResolvedValue({
      programs: ['Medicine'],
      years: ['Year 1'],
      universities: ['Makerere University'],
      locations: ['Uganda'],
      statuses: ['active'],
    });
  });

  it('reopens an edited resource from the updated query cache', async () => {
    mockGetResources
      .mockReset()
      .mockResolvedValueOnce([resource])
      .mockImplementation(() => new Promise(() => undefined));
    mockUpdateResource.mockResolvedValue({
      ...resource,
      title: 'Updated title',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });

    renderResources();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update resource' }));

    await waitFor(() => expect(screen.queryByText('Edit resource')).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Title')).toHaveValue('Updated title');
  });

  it('keeps the edit dialog mounted when the row leaves the filtered list', async () => {
    renderResources();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByPlaceholderText('Search resources'), {
      target: { value: 'does not match' },
    });

    expect(screen.getByText('Edit resource')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Original title');
  });

  it('keeps the edit snapshot when a refetch removes the resource', async () => {
    const { queryClient } = renderResources();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    act(() => {
      queryClient.setQueryData(['resources'], []);
    });

    expect(screen.getByText('Edit resource')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Original title');
  });
});
