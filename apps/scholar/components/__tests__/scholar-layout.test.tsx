import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ScholarLayout } from '../scholar-layout';

const mockGetMyProfile = jest.fn();

jest.mock('../../lib/api/profile', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

function getSidebar() {
  return document.querySelector('[data-side="left"]') as HTMLElement;
}

function getToggle() {
  return document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
}

async function renderLayout(children: ReactNode = <p>Dashboard content</p>, onLogout = jest.fn()) {
  const result = render(<ScholarLayout onLogout={onLogout}>{children}</ScholarLayout>);
  await waitFor(() => expect(mockGetMyProfile).toHaveBeenCalled());

  let heading = 'Ashinaga Scholar Portal';
  try {
    const profile = await mockGetMyProfile.mock.results.at(-1)?.value;
    if (profile?.programStage === 'prep_year') {
      heading = 'Ashinaga Prep Year';
    }
  } catch {
    // Failed profile load keeps scholar branding and hides Annual Review.
  }

  await screen.findByRole('heading', { name: heading });
  return result;
}

describe('ScholarLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyProfile.mockResolvedValue({ programStage: 'scholar' });
  });

  it('renders navigation links and page content', async () => {
    await renderLayout();

    expect(screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/dashboard');
    expect(await screen.findByRole('link', { name: 'My Annual Review' })).toHaveAttribute(
      'href',
      '/annual-review'
    );
    expect(screen.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources');
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(getToggle()).toBeInTheDocument();
  });

  it('keeps hamburger, brand, and actions on one top rail', async () => {
    await renderLayout();

    const header = screen.getByRole('banner');
    const brand = screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' });
    const toggle = getToggle();

    expect(header).toContainElement(brand);
    expect(header).toContainElement(toggle);
    expect(toggle.compareDocumentPosition(brand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll('[data-sidebar="trigger"]')).toHaveLength(1);
    expect(document.querySelector('[data-sidebar="header"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Overview' })).not.toBeInTheDocument();
  });

  it('collapses to an icon rail while keeping the header toggle visible', async () => {
    const user = userEvent.setup();
    await renderLayout();

    const sidebar = getSidebar();
    expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await user.click(getToggle());
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
    expect(screen.getByRole('banner')).toContainElement(getToggle());

    await user.click(getToggle());
    expect(sidebar).toHaveAttribute('data-state', 'expanded');
  });

  it('calls onLogout from the sidebar footer', async () => {
    const user = userEvent.setup();
    const onLogout = jest.fn();
    await renderLayout(<p>Dashboard content</p>, onLogout);

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows scholar nav including annual review for confirmed scholars', async () => {
    await renderLayout(<div>content</div>);

    expect(await screen.findByRole('link', { name: 'My Annual Review' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Documents' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ashinaga Prep Year' })).not.toBeInTheDocument();
  });

  it('hides annual review for prep-year users and does not add My Documents', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    await renderLayout(<div>content</div>);

    expect(screen.getByRole('heading', { name: 'Ashinaga Prep Year' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Annual Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Documents' })).not.toBeInTheDocument();
  });

  it('does not show annual review when profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));

    await renderLayout(<div>content</div>);

    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Annual Review' })).not.toBeInTheDocument();
  });
});
