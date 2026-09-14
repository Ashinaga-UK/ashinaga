'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MyAnnualReview } from '../../../components/my-annual-review';
import { useScholarSession } from '../../../lib/scholar-session';

export default function AnnualReviewPage() {
  const router = useRouter();
  const { programStage, profileStatus } = useScholarSession();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (profileStatus === 'loading') return;
    if (profileStatus === 'error' || programStage !== 'scholar') {
      router.replace('/dashboard');
      return;
    }
    setAllowed(true);
  }, [profileStatus, programStage, router]);

  if (!allowed) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="p-6">
      <MyAnnualReview />
    </div>
  );
}
