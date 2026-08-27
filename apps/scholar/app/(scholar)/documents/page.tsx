'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MyDocuments } from '../../../components/my-documents';
import { useScholarSession } from '../../../lib/scholar-session';

export default function DocumentsPage() {
  const router = useRouter();
  const { programStage, profileStatus } = useScholarSession();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (profileStatus === 'loading') return;
    if (profileStatus === 'error' || programStage !== 'prep_year') {
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
      <MyDocuments />
    </div>
  );
}
