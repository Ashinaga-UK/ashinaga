import { fireEvent, render, screen } from '@testing-library/react';

const mockUseMyAnnouncements = jest.fn();

jest.mock('../../../lib/hooks/use-queries', () => ({
  useMyAnnouncements: (...args: unknown[]) => mockUseMyAnnouncements(...args),
}));

// Radix Select is awkward in jsdom; render a native select so filters can be driven.
jest.mock('../../../components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import AnnouncementsPage from './page';

const announcement = {
  id: 'a1',
  title: 'Welcome',
  content: 'Hello scholars',
  createdBy: 'Staff',
  createdAt: '2026-01-01T00:00:00.000Z',
  filters: [{ type: 'year', value: '2026' }],
};

describe('AnnouncementsPage empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows unfiltered copy without Reset filters when there are no announcements', () => {
    mockUseMyAnnouncements.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AnnouncementsPage />);

    expect(screen.getByText('No announcements yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
  });

  it('shows filtered copy with Reset filters when filters hide every announcement', () => {
    mockUseMyAnnouncements.mockReturnValue({
      data: [
        {
          ...announcement,
          id: 'a1',
          title: 'Year 2025 news',
          filters: [
            { type: 'year', value: '2025' },
            { type: 'program', value: 'Alpha' },
          ],
        },
        {
          ...announcement,
          id: 'a2',
          title: 'Year 2026 news',
          filters: [
            { type: 'year', value: '2026' },
            { type: 'program', value: 'Beta' },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<AnnouncementsPage />);
    const [yearSelect, programSelect] = screen.getAllByRole('combobox');
    fireEvent.change(yearSelect, { target: { value: '2025' } });
    fireEvent.change(programSelect, { target: { value: 'Beta' } });

    expect(screen.getByText('No announcements match these filters')).toBeInTheDocument();
    expect(screen.queryByText('No announcements yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getByText('Year 2025 news')).toBeInTheDocument();
    expect(screen.getByText('Year 2026 news')).toBeInTheDocument();
  });
});
