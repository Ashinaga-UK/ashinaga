import { createAuthClient } from 'better-auth/react';

// Remove trailing slash from API URL to prevent double slashes.
// Signup fetches this same origin so the session cookie matches sign-in.
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

const authClient = createAuthClient({
  baseURL: apiBaseUrl,
}) as any;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  getSession,
} = authClient;

export { authClient };
