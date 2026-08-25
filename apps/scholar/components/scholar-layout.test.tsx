import { render, screen, waitFor } from '@testing-library/react';
import { ScholarLayout } from './scholar-layout';

const mockGetMyProfile = jest.fn();

jest.mock('../lib/api/profile', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
}));

describe('ScholarLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows scholar nav including annual review for confirmed scholars', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });

    render(
      <ScholarLayout onLogout={jest.fn()}>
        <div>content</div>
      </ScholarLayout>
    );

    expect(await screen.findByText('My Annual Review')).toBeInTheDocument();
    expect(screen.getByText('My LDF')).toBeInTheDocument();
    expect(screen.queryByText('My Documents')).not.toBeInTheDocument();
    expect(screen.getByText('Scholar Portal')).toBeInTheDocument();
    expect(screen.queryByText('Prep Year')).not.toBeInTheDocument();
  });

  it('hides annual review for prep-year users and does not add My Documents', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    render(
      <ScholarLayout onLogout={jest.fn()}>
        <div>content</div>
      </ScholarLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Prep Year')).toBeInTheDocument();
    });
    expect(screen.getByText('My LDF')).toBeInTheDocument();
    expect(screen.queryByText('My Annual Review')).not.toBeInTheDocument();
    expect(screen.queryByText('My Documents')).not.toBeInTheDocument();
  });

  it('does not show annual review when profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));

    render(
      <ScholarLayout onLogout={jest.fn()}>
        <div>content</div>
      </ScholarLayout>
    );

    expect(await screen.findByText('My LDF')).toBeInTheDocument();
    expect(screen.queryByText('My Annual Review')).not.toBeInTheDocument();
  });
});
