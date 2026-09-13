import { render, screen } from '@testing-library/react';
import { StaleActivityBadge } from '../stale-activity-badge';

describe('StaleActivityBadge', () => {
  it('renders nothing when activity is not stale', () => {
    const { container } = render(<StaleActivityBadge stale={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the coordinator alert copy', () => {
    render(<StaleActivityBadge stale />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
