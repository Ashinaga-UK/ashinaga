import { render, screen } from '@testing-library/react';
import StudentHome from '../page';

describe('StudentHome', () => {
  it('renders the student portal heading', () => {
    render(<StudentHome />);

    const heading = screen.getByText('Ashinaga Student Portal');
    expect(heading).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<StudentHome />);

    const welcomeText = screen.getByText('Welcome to your learning journey');
    expect(welcomeText).toBeInTheDocument();
  });

  it('renders the coming soon message', () => {
    render(<StudentHome />);

    const comingSoonText = screen.getByText('Coming soon...');
    expect(comingSoonText).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(<StudentHome />);

    const logo = screen.getByText('A');
    expect(logo).toBeInTheDocument();
  });
});
