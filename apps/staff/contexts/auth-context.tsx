'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '../lib/auth-client';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Session hook handles its own loading state
    setIsLoading(session.isPending);
  }, [session.isPending]);

  return (
    <AuthContext.Provider
      value={{
        user: session.data?.user || null,
        isLoading,
        isAuthenticated: !!session.data?.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
