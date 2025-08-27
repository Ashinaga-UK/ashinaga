import { Suspense } from 'react';
import { ResetPasswordPage } from '../../components/reset-password-page';

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}

export const metadata = {
  title: 'Reset Password - Ashinaga Staff Portal',
  description: 'Create a new password for your Ashinaga Staff Portal account',
};
