import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ScholarLayout } from '../scholar-layout';
import { SidebarProvider, SidebarTrigger } from '../ui/sidebar';

const mockGetMyProfile = jest.fn();
const navState = { pathname: '' };

jest.mock('../../lib/api/profile', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
}));

jest.mock('../../lib/api-client', () => ({
  getScholarNotificationsFeed: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    unreadCount: 0,
    page: 1,
    limit: 20,
  }),
  markScholarNotificationsRead: jest.fn().mockResolvedValue({ updated: 0 }),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => navState.pathname,
}));

function getSidebar() {
  return document.querySelector('[data-side="left"]') as HTMLElement;
}

function getToggle() {
  return document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
}

function withMobileViewport() {
  const previousWidth = window.innerWidth;
  const previousMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  return () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
    window.matchMedia = previousMatchMedia;
  };
}

function expectTriggerShownOnMobile(toggle: HTMLElement) {
  let node: Element | null = toggle;
  while (node) {
    const tokens = (node.getAttribute('class') ?? '').split(/\s+/);
    expect(tokens).not.toContain('hidden');
    expect(tokens).not.toContain('md:hidden');
    node = node.parentElement;
  }
}

async function renderLayout(children: ReactNode = <p>Dashboard content</p>, onLogout = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ScholarLayout onLogout={onLogout}>{children}</ScholarLayout>
    </QueryClientProvider>
  );
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
    navState.pathname = '';
    // biome-ignore lint/suspicious/noDocumentCookie: tests seed the sidebar persistence cookie
    document.cookie = 'sidebar:state:scholar=true; path=/';
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
    expect(screen.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '/faqs');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(getToggle()).toBeInTheDocument();
  });

  it('locks the shell to the viewport so the sidebar stays put while content scrolls', async () => {
    await renderLayout();

    const wrapper = document.querySelector('[style*="--sidebar-width"]') as HTMLElement;
    expect(wrapper.className).toContain('h-svh');
    expect(wrapper.className).toContain('overflow-hidden');

    const inset = document.querySelector('main') as HTMLElement;
    expect(inset.className).toContain('overflow-y-auto');
    expect(inset.className).toContain('overscroll-none');
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

  it('keeps the menu trigger and section title on inner pages', async () => {
    navState.pathname = '/profile';
    await renderLayout();

    const header = screen.getByRole('banner');
    const toggle = getToggle();
    const sectionTitle = screen.getByRole('heading', { name: 'My Profile' });

    expect(toggle).toHaveAccessibleName('Toggle sidebar');
    expect(toggle).not.toHaveClass('hidden');
    expect(header).toContainElement(toggle);
    expect(header).toContainElement(sectionTitle);
    expect(screen.queryByRole('link', { name: 'Back to Overview' })).not.toBeInTheDocument();
    expect(screen.queryByText('Back to Overview')).not.toBeInTheDocument();
    expect(
      toggle.compareDocumentPosition(sectionTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('opens the mobile sheet from an inner page', async () => {
    const restore = withMobileViewport();
    const user = userEvent.setup();
    navState.pathname = '/profile';
    try {
      await renderLayout();

      await waitFor(() => {
        expect(document.querySelector('[data-side="left"]')).not.toBeInTheDocument();
      });
      const toggle = getToggle();
      expectTriggerShownOnMobile(toggle);
      await user.click(toggle);
      expect(await screen.findByRole('button', { name: 'Close menu' })).toBeInTheDocument();
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('restores a collapsed desktop sidebar from the cookie', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: tests seed the sidebar persistence cookie
    document.cookie = 'sidebar:state:scholar=false; path=/';
    await renderLayout();

    expect(getSidebar()).toHaveAttribute('data-state', 'collapsed');
  });

  it('gives a bare sidebar trigger an accessible name', () => {
    render(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>
    );

    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'My Proposal' })).toHaveAttribute('href', '/proposal');
    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Documents' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ashinaga Prep Year' })).not.toBeInTheDocument();
  });

  it('shows My Documents for prep-year users and hides annual review', async () => {
    mockGetMyProfile.mockResolvedValue({ programStage: 'prep_year' });

    await renderLayout(<div>content</div>);

    expect(screen.getByRole('heading', { name: 'Ashinaga Prep Year' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Proposal' })).toHaveAttribute('href', '/proposal');
    expect(screen.queryByRole('link', { name: 'My Annual Review' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Documents' })).toHaveAttribute(
      'href',
      '/documents'
    );
  });

  it('does not show annual review when profile loading fails', async () => {
    mockGetMyProfile.mockRejectedValue(new Error('offline'));

    await renderLayout(<div>content</div>);

    expect(screen.getByRole('link', { name: 'My LDF' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Annual Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Documents' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Proposal' })).not.toBeInTheDocument();
  });

  it('does not show Proposal while the profile is still loading', async () => {
    navState.pathname = '/proposal';
    mockGetMyProfile.mockReturnValue(new Promise(() => {}));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ScholarLayout onLogout={jest.fn()}>content</ScholarLayout>
      </QueryClientProvider>
    );
    await waitFor(() => expect(mockGetMyProfile).toHaveBeenCalled());

    expect(screen.queryByRole('link', { name: 'My Proposal' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Proposal' })).toBeInTheDocument();
  });
});
