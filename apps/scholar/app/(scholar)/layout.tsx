'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ScholarLayout } from '../../components/scholar-layout';
import { signOut, useSession } from '../../lib/auth-client';

export default function ScholarRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const refetchSession = useRef(refetch);
  refetchSession.current = refetch;

  // useSession can miss a response and stay pending (seen in CI e2e on mobile
  // navigations). Keep asking until the client leaves the pending state.
  useEffect(() => {
    if (!isPending) return;
    const interval = window.setInterval(() => {
      void refetchSession.current();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPending]);

  const user = session?.user;
  const isAuthenticated = !!user;
  const isScholar = user?.userType === 'scholar';

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (isAuthenticated && !isScholar) {
      signOut();
      router.push('/?accessDenied=true');
    }
  }, [isAuthenticated, isScholar, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.user || !isScholar) {
    return null;
  }

  return <ScholarLayout onLogout={handleLogout}>{children}</ScholarLayout>;
}
