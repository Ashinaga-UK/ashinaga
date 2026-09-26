import { render, screen } from '@testing-library/react';
import { PlatformSetupCard } from '../platform-setup-card';

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

describe('PlatformSetupCard', () => {
  it('shows known platform icons, safe links, and a name-only fallback', () => {
    render(
      <PlatformSetupCard
        setups={[
          {
            platformId: 'p1',
            slug: 'coursera',
            name: 'Coursera',
            signpostingUrl: 'https://www.coursera.org/',
            sortOrder: 1,
            status: 'pending',
          },
          {
            platformId: 'p2',
            slug: 'email',
            name: 'Email',
            signpostingUrl: null,
            sortOrder: 2,
            status: 'yes',
          },
          {
            platformId: 'p3',
            slug: 'custom_platform',
            name: 'Custom platform',
            signpostingUrl: 'javascript:alert(1)',
            sortOrder: 3,
            status: 'yes',
          },
        ]}
        onStatusChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('platform-icon-coursera')).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon-email')).toBeInTheDocument();
    expect(screen.queryByTestId('platform-icon-custom_platform')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://www.coursera.org/' })).toHaveAttribute(
      'href',
      'https://www.coursera.org/'
    );
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument();
    expect(screen.getByText('Custom platform')).toBeInTheDocument();
  });
});
