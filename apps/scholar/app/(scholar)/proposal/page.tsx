'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MyProposal } from '../../../components/my-proposal';
import { useScholarSession } from '../../../lib/scholar-session';

export default function ProposalPage() {
  const router = useRouter();
  const { profileStatus } = useScholarSession();

  useEffect(() => {
    if (profileStatus === 'error') {
      router.replace('/dashboard');
    }
  }, [profileStatus, router]);

  if (profileStatus === 'loading') {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }
  if (profileStatus === 'error') {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="p-6">
      <MyProposal />
    </div>
  );
}
