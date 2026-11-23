import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from '../../lib/auth-client';
import { LoginPage } from '../login-page';

const push = jest.fn();
const refresh = jest.fn();

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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('../../lib/auth-client', () => ({
  signIn: { email: jest.fn() },
}));

const signInEmail = signIn.email as jest.Mock;

async function submitCredentials() {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText('Email'), 'staff@ashinaga.org');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('LoginPage sign-in errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the deactivated message for ACCOUNT_DEACTIVATED', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'Server wording', status: 403 },
    });

    await submitCredentials();

    expect(
      await screen.findByText('Your account has been deactivated. Please contact an administrator.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps the deactivated message when the server omits a message', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: 'ACCOUNT_DEACTIVATED', status: 403 },
    });

    await submitCredentials();

    expect(await screen.findByText(/has been deactivated/)).toBeInTheDocument();
  });

  it('shows the server message for invalid credentials without the deactivated copy', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
    });

    await submitCredentials();

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText(/deactivated/)).not.toBeInTheDocument();
  });

  it('falls back to the generic message when an error has no message or code', async () => {
    signInEmail.mockResolvedValue({ data: null, error: {} });

    await submitCredentials();

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText(/deactivated/)).not.toBeInTheDocument();
  });

  it('redirects on success', async () => {
    signInEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    await submitCredentials();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(screen.queryByText(/deactivated/)).not.toBeInTheDocument();
  });
});
