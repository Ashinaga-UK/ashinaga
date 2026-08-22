'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MyAnnualReview } from '../../../components/my-annual-review';
import { getMyProfile } from '../../../lib/api/profile';

export default function AnnualReviewPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (profile.programStage === 'prep_year') {
          router.replace('/dashboard');
          return;
        }
        setAllowed(true);
      })
      .catch(() => setAllowed(true));
  }, [router]);

  if (!allowed) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="p-6">
      <MyAnnualReview />
    </div>
  );
}
