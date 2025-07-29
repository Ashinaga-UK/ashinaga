import { render, screen } from '@testing-library/react';
import ScholarHome from '../page';

describe('ScholarHome', () => {
  it('renders the scholar portal heading', () => {
    render(<ScholarHome />);

    const heading = screen.getByText('Ashinaga Scholar Portal');
    expect(heading).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<ScholarHome />);

    const welcomeText = screen.getByText('Welcome to your learning journey');
    expect(welcomeText).toBeInTheDocument();
  });

  it('renders the coming soon message', () => {
    render(<ScholarHome />);

    const comingSoonText = screen.getByText('Coming soon...');
    expect(comingSoonText).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(<ScholarHome />);

    const logo = screen.getByText('A');
    expect(logo).toBeInTheDocument();
  });
});
