import { Suspense } from 'react';
import { SignupPage } from '../../components/signup-page';

export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPage />
    </Suspense>
  );
}

export const metadata = {
  title: 'Sign Up - Ashinaga Staff Portal',
  description: 'Create your account to access the Ashinaga Staff Portal',
};
