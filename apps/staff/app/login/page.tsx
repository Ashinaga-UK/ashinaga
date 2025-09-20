import { Suspense } from 'react';
import { LoginPage } from '../../components/login-page';

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}

export const metadata = {
  title: 'Sign In - Ashinaga Staff Portal',
  description: 'Sign in to access the Ashinaga Staff Portal',
};
