import { Suspense } from 'react';
import { SignupPage } from '@/components/signup-page';

export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPage />
    </Suspense>
  );
}
