import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformLinksEditor } from '../platform-links-editor';

const mockGetPlatformLinks = jest.fn();
const mockUpdatePlatformLink = jest.fn();

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
  getPlatformLinks: (...args: unknown[]) => mockGetPlatformLinks(...args),
  updatePlatformLink: (...args: unknown[]) => mockUpdatePlatformLink(...args),
}));

const coursera = {
  id: 'platform-1',
  slug: 'coursera',
  name: 'Coursera',
  signpostingUrl: 'https://www.coursera.org/',
  sortOrder: 1,
};

describe('PlatformLinksEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is hidden from staff viewers', async () => {
    mockGetPlatformLinks.mockResolvedValue({ platforms: [coursera], canEdit: false });

    render(<PlatformLinksEditor />);

    await waitFor(() => expect(mockGetPlatformLinks).toHaveBeenCalled());
    expect(screen.queryByText('Platform links')).not.toBeInTheDocument();
  });

  it('lets a staff admin update a platform link', async () => {
    const user = userEvent.setup();
    mockGetPlatformLinks.mockResolvedValue({ platforms: [coursera], canEdit: true });
    mockUpdatePlatformLink.mockResolvedValue({
      ...coursera,
      signpostingUrl: 'https://learn.example.org/',
    });

    render(<PlatformLinksEditor />);

    const input = await screen.findByLabelText('Coursera');
    await user.clear(input);
    await user.type(input, 'https://learn.example.org/');
    await user.click(screen.getByRole('button', { name: 'Save Coursera link' }));

    await waitFor(() =>
      expect(mockUpdatePlatformLink).toHaveBeenCalledWith('coursera', 'https://learn.example.org/')
    );
    expect(await screen.findByText('Coursera link saved.')).toBeInTheDocument();
  });
});
