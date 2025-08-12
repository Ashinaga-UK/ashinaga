import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
}) as any;

export const { signIn, signUp, signOut, useSession } = authClient;
export { authClient };
