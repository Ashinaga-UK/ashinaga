'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut, useSession } from '../../lib/auth-client';
import { ScholarLayout } from '../../components/scholar-layout';

export default function ScholarRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

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
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session?.user || !isScholar) {
    return null;
  }

  return <ScholarLayout onLogout={handleLogout}>{children}</ScholarLayout>;
}
