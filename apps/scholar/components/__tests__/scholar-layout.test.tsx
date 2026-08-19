import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScholarLayout } from '../scholar-layout';

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

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
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
  });

  it('collapses and expands the sidebar from the header trigger', async () => {
    const user = userEvent.setup();
    render(
      <ScholarLayout onLogout={jest.fn()}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

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
    render(
      <ScholarLayout onLogout={onLogout}>
        <p>Dashboard content</p>
      </ScholarLayout>
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
