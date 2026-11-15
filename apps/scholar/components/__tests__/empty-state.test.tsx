import { fireEvent, render, screen } from '@testing-library/react';
import { Library } from 'lucide-react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders the title and description without an action', () => {
    render(<EmptyState icon={Library} title="Nothing here" description="Check back later." />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Check back later.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the optional action', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        icon={Library}
        title="Nothing here"
        description="Check back later."
        action={
          <button type="button" onClick={onClick}>
            Do something
          </button>
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Do something' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a custom className', () => {
    const { container } = render(
      <EmptyState icon={Library} title="T" description="D" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('min-h-[220px]');
  });
});
