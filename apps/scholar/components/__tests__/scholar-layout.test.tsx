import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScholarLayout } from '../scholar-layout';

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

function getSidebar() {
  return document.querySelector('[data-side="left"]') as HTMLElement;
}

function getToggle() {
  return document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
}

describe('ScholarLayout', () => {
  it('renders navigation links and page content', () => {
    render(
      <ScholarLayout onLogout={jest.fn()}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

    expect(screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'My Annual Review' })).toHaveAttribute(
      'href',
      '/annual-review'
    );
    expect(screen.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources');
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(getToggle()).toBeInTheDocument();
  });

  it('places brand then toggle on one top rail, with no second title', () => {
    render(
      <ScholarLayout onLogout={jest.fn()}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

    const header = screen.getByRole('banner');
    const brand = screen.getByRole('heading', { name: 'Ashinaga Scholar Portal' });
    const toggle = getToggle();

    expect(header).toContainElement(brand);
    expect(header).toContainElement(toggle);
    expect(brand.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('[data-sidebar="header"]')).not.toBeInTheDocument();
  });

  it('collapses to an icon rail while keeping the header toggle visible', async () => {
    const user = userEvent.setup();
    render(
      <ScholarLayout onLogout={jest.fn()}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

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
    render(
      <ScholarLayout onLogout={onLogout}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
