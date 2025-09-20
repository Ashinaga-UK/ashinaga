import { SignupPage } from '@/components/signup-page';
import { Suspense } from 'react';

export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPage />
    </Suspense>
  );
}
