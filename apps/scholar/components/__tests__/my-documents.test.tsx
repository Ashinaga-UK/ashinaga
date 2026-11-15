import { render, screen } from '@testing-library/react';

const mockUseMyDocumentChecklist = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('../../lib/hooks/use-queries', () => ({
  queryKeys: { myDocuments: ['my-documents'] },
  useMyDocumentChecklist: () => mockUseMyDocumentChecklist(),
}));

jest.mock('../../lib/api-client', () => ({
  confirmDocumentUpload: jest.fn(),
  createDocumentUploadUrl: jest.fn(),
  getRequiredDocumentDownloadUrl: jest.fn(),
}));

import { MyDocuments } from '../my-documents';

describe('MyDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the loading state before the empty state', () => {
    mockUseMyDocumentChecklist.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<MyDocuments />);

    expect(screen.getByText('Loading your documents...')).toBeInTheDocument();
    expect(screen.queryByText('Nothing required yet')).not.toBeInTheDocument();
  });

  it('shows the error state instead of the empty state', () => {
    mockUseMyDocumentChecklist.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    render(<MyDocuments />);

    expect(screen.getByText(/Could not load required documents/)).toBeInTheDocument();
    expect(screen.queryByText('Nothing required yet')).not.toBeInTheDocument();
  });

  it('shows a calm empty state when no documents are required', () => {
    mockUseMyDocumentChecklist.mockReturnValue({
      data: { scholarId: 's1', items: [] },
      isLoading: false,
      error: null,
    });

    render(<MyDocuments />);

    expect(screen.getByText('Nothing required yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  it('renders the checklist when documents are required', () => {
    mockUseMyDocumentChecklist.mockReturnValue({
      data: {
        scholarId: 's1',
        items: [
          {
            type: { id: 't1', label: 'Passport', description: null },
            status: 'missing',
            file: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<MyDocuments />);

    expect(screen.getByText('Passport')).toBeInTheDocument();
    expect(screen.queryByText('Nothing required yet')).not.toBeInTheDocument();
  });
});
