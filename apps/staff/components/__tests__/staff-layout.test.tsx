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

  it('collapses and expands the sidebar from the header trigger', async () => {
    const user = userEvent.setup();
    renderLayout();

    const sidebar = document.querySelector('[data-side="left"]');
    expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-collapsible', 'icon');

    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
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
