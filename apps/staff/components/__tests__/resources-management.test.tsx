import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResourcesManagement } from '../resources-management';

const mockGetResources = jest.fn();
const mockGetResourceFilterOptions = jest.fn();
const mockUpdateResource = jest.fn();
const mockCreateResource = jest.fn();
const mockDeleteResource = jest.fn();
const mockCreateResourceUploadUrl = jest.fn();
const mockToast = jest.fn();

const fileValidationMessage =
  'File type not supported. Accepted formats: PDF, Word, Excel, PowerPoint. Maximum size: 10MB.';

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
    Eye: Icon,
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
  getResourceDownloadUrl: jest.fn(),
  updateResource: (...args: unknown[]) => mockUpdateResource(...args),
  createResource: (...args: unknown[]) => mockCreateResource(...args),
  deleteResource: (...args: unknown[]) => mockDeleteResource(...args),
  createResourceUploadUrl: (...args: unknown[]) => mockCreateResourceUploadUrl(...args),
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

const fileResource = {
  ...resource,
  sourceType: 'file' as const,
  url: null,
  fileName: 'handbook.pdf',
  fileMimeType: 'application/pdf',
  fileSizeBytes: 2048,
};

function fileWithSize(name: string, type: string, size = 1024) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function chooseDocument(file: File) {
  fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file] } });
}

async function openCreateUpload() {
  fireEvent.click(await screen.findByRole('button', { name: 'Add resource' }));
  fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));
}

function mockUploadFetch(ok: boolean) {
  const fetchMock = jest.fn().mockResolvedValue({ ok });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function mockSuccessfulUpload() {
  mockCreateResourceUploadUrl.mockResolvedValue({
    uploadUrl: 'https://uploads.example/resource',
    fields: { key: 'resources/pending/file' },
    fileKey: 'resources/pending/file',
  });
  return mockUploadFetch(true);
}

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

  it('shows a persistent inline error and disables save for an unsupported file', async () => {
    renderResources();
    await openCreateUpload();
    chooseDocument(fileWithSize('notes.txt', 'text/plain'));

    expect(await screen.findByRole('alert')).toHaveTextContent(fileValidationMessage);
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeDisabled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Could not upload document',
      description: 'Please choose a PDF, Word, Excel, or PowerPoint file.',
      variant: 'destructive',
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Save resource' }).closest('form')!);
    expect(mockCreateResource).not.toHaveBeenCalled();
    expect(mockCreateResourceUploadUrl).not.toHaveBeenCalled();
  });

  it('shows the same inline error and disables save for a file over 10MB', async () => {
    renderResources();
    await openCreateUpload();
    chooseDocument(fileWithSize('large.pdf', 'application/pdf', 15 * 1024 * 1024));

    expect(await screen.findByRole('alert')).toHaveTextContent(fileValidationMessage);
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeDisabled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Could not upload document',
      description: 'Please choose a file smaller than 10MB.',
      variant: 'destructive',
    });
  });

  it('keeps save enabled after a valid pdf or docx upload', async () => {
    mockSuccessfulUpload();
    renderResources();
    await openCreateUpload();

    chooseDocument(fileWithSize('guide.pdf', 'application/pdf'));
    expect(await screen.findByText('guide.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeEnabled();

    chooseDocument(
      fileWithSize(
        'guide.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    );
    await waitFor(() => expect(screen.getByText('guide.docx')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeEnabled();
  });

  it('shows the inline error when the upload API rejects the file', async () => {
    mockCreateResourceUploadUrl.mockRejectedValue(
      new Error('API Error: 400 - {"message":"File size exceeds 10MB limit"}')
    );
    renderResources();
    await openCreateUpload();
    chooseDocument(fileWithSize('notes.pdf', 'application/pdf'));

    expect(await screen.findByRole('alert')).toHaveTextContent(fileValidationMessage);
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeDisabled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not upload document',
        variant: 'destructive',
      })
    );
  });

  it('does not block save when the file is valid but storage upload fails', async () => {
    mockCreateResourceUploadUrl.mockResolvedValue({
      uploadUrl: 'https://uploads.example/resource',
      fields: {},
      fileKey: 'resources/pending/file',
    });
    mockUploadFetch(false);
    renderResources();
    await openCreateUpload();
    chooseDocument(fileWithSize('notes.pdf', 'application/pdf'));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Could not upload document',
        description: 'Could not upload the document. Please try again.',
        variant: 'destructive',
      })
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeEnabled();
  });

  it('blocks update until a rejected file is replaced with a valid one', async () => {
    mockGetResources.mockResolvedValue([fileResource]);
    renderResources();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    chooseDocument(fileWithSize('notes.txt', 'text/plain'));

    expect(await screen.findByRole('alert')).toHaveTextContent(fileValidationMessage);
    const updateButton = screen.getByRole('button', { name: 'Update resource' });
    expect(updateButton).toBeDisabled();
    fireEvent.submit(updateButton.closest('form')!);
    expect(mockUpdateResource).not.toHaveBeenCalled();

    mockSuccessfulUpload();
    chooseDocument(fileWithSize('notes.pdf', 'application/pdf'));
    expect(await screen.findByText('Replacement ready: notes.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update resource' })).toBeEnabled();
  });

  it('clears the file error when the dialog is closed or the source switches to a URL', async () => {
    renderResources();
    await openCreateUpload();
    chooseDocument(fileWithSize('notes.txt', 'text/plain'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'External URL' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    chooseDocument(fileWithSize('notes.txt', 'text/plain'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Add a URL or uploaded document and choose which scholars should see it.'
        )
      ).not.toBeInTheDocument()
    );

    await openCreateUpload();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save resource' })).toBeEnabled();
  });
});
