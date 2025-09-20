import { Suspense } from 'react';
import { LoginPage } from '../components/login-page';

export default function ScholarHome() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}

export const metadata = {
  title: 'Sign In - Ashinaga Scholar Portal',
  description: 'Sign in to access the Ashinaga Scholar Portal',
};
