import { createAuthClient } from 'better-auth/react';

// Remove trailing slash from API URL to prevent double slashes
const baseURL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const authClient = createAuthClient({
  baseURL,
}) as any;

export const { signIn, signUp, signOut, useSession, forgetPassword, resetPassword, getSession } =
  authClient;

export { authClient };
