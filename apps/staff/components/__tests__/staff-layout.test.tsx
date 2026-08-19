import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffLayout } from '../staff-layout';

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

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('../theme-toggle', () => ({
  ThemeToggle: () => null,
}));

function getSidebar() {
  return document.querySelector('[data-side="left"]') as HTMLElement;
}

function getDesktopToggle() {
  return document.querySelector(
    '[data-sidebar="sidebar"] [data-sidebar="trigger"]'
  ) as HTMLButtonElement;
}

describe('StaffLayout', () => {
  const renderLayout = (onLogout = jest.fn()) =>
    render(
      <StaffLayout
        activeTab="overview"
        onLogout={onLogout}
        onOpenProfile={jest.fn()}
        user={{ name: 'Ada Staff' }}
      >
        <p>Staff content</p>
      </StaffLayout>
    );

  it('renders staff navigation and preserves the authenticated heading', () => {
    renderLayout();

    expect(screen.getByRole('heading', { name: 'Ashinaga Staff' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Annual Reviews' })).toHaveAttribute(
      'href',
      '/?tab=annual-reviews'
    );
    expect(screen.getByRole('link', { name: 'Resources' })).toHaveAttribute(
      'href',
      '/?tab=resources'
    );
    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute(
      'href',
      '/?tab=invitations'
    );
    expect(screen.getByText('Staff content')).toBeInTheDocument();
  });

  it('places the collapse toggle on the same header row, opposite the Ashinaga brand', () => {
    renderLayout();

    const header = document.querySelector('[data-sidebar="header"]') as HTMLElement;
    const brand = screen.getByText('Ashinaga');
    const toggle = getDesktopToggle();

    expect(header).toContainElement(brand);
    expect(header).toContainElement(toggle);
    expect(brand.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('collapses to an icon rail while keeping the in-sidebar toggle visible', async () => {
    const user = userEvent.setup();
    renderLayout();

    const sidebar = getSidebar();
    expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await user.click(getDesktopToggle());
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
    expect(getDesktopToggle()).toBeInTheDocument();

    await user.click(getDesktopToggle());
    expect(sidebar).toHaveAttribute('data-state', 'expanded');
  });

  it('calls onLogout from the sidebar footer', async () => {
    const user = userEvent.setup();
    const onLogout = jest.fn();
    renderLayout(onLogout);

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
