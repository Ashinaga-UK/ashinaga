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

function getToggle() {
  return document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
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

  it('places brand then toggle on one top rail, with no second title', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    const brand = screen.getByRole('heading', { name: 'Ashinaga Staff' });
    const toggle = getToggle();

    expect(header).toContainElement(brand);
    expect(header).toContainElement(toggle);
    expect(brand.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('[data-sidebar="header"]')).not.toBeInTheDocument();
  });

  it('collapses to an icon rail while keeping the header toggle visible', async () => {
    const user = userEvent.setup();
    renderLayout();

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
    renderLayout(onLogout);

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
