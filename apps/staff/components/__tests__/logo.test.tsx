import { render, screen } from '@testing-library/react';
import { Logo } from '../logo';

describe('Logo', () => {
  it('renders the Ashinaga logo text', () => {
    render(<Logo />);

    const logoText = screen.getByText('Ashinaga');
    expect(logoText).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-logo-class';
    render(<Logo className={customClass} />);

    const logoElement = screen.getByText('Ashinaga');
    expect(logoElement).toHaveClass(customClass);
  });

  it('has correct default styling classes', () => {
    render(<Logo />);

    const logoElement = screen.getByText('Ashinaga');
    expect(logoElement).toHaveClass('text-2xl', 'font-bold', 'text-gray-900', 'dark:text-white');
  });
});
