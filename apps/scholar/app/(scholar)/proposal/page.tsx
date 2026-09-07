'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MyProposal } from '../../../components/my-proposal';
import { useScholarSession } from '../../../lib/scholar-session';

export default function ProposalPage() {
  const router = useRouter();
  const { profileStatus } = useScholarSession();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (profileStatus === 'loading') return;
    if (profileStatus === 'error') {
      router.replace('/dashboard');
      return;
    }
    setAllowed(true);
  }, [profileStatus, router]);

  if (!allowed) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="p-6">
      <MyProposal />
    </div>
  );
}
