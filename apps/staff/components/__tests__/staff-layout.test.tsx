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

jest.mock('@workspace/ui', () => ({
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
    expect(screen.getByRole('link', { name: 'Prep documents' })).toHaveAttribute(
      'href',
      '/?tab=prep-documents'
    );
    expect(screen.getByRole('link', { name: 'Prep tasks' })).toHaveAttribute(
      'href',
      '/?tab=prep-tasks'
    );
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

  it('keeps hamburger, brand, and actions on one top rail', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    const brand = screen.getByRole('heading', { name: 'Ashinaga Staff' });
    const toggle = getToggle();

    expect(header).toContainElement(brand);
    expect(header).toContainElement(toggle);
    expect(toggle.compareDocumentPosition(brand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll('[data-sidebar="trigger"]')).toHaveLength(1);
    expect(document.querySelector('[data-sidebar="header"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open my profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Overview' })).not.toBeInTheDocument();
  });

  it('shows a back control away from overview', () => {
    render(
      <StaffLayout
        activeTab="scholars"
        onLogout={jest.fn()}
        onOpenProfile={jest.fn()}
        user={{ name: 'Ada Staff' }}
      >
        <p>Staff content</p>
      </StaffLayout>
    );

    const header = screen.getByRole('banner');
    const back = screen.getByRole('link', { name: 'Back to Overview' });
    const sectionTitle = screen.getByRole('heading', { name: 'Scholars' });

    expect(back).toHaveAttribute('href', '/');
    expect(header).toContainElement(back);
    expect(header).toContainElement(sectionTitle);
    expect(getToggle()).toHaveClass('hidden');
    expect(
      back.compareDocumentPosition(sectionTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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
