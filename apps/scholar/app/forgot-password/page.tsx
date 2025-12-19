import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/components/forgot-password-page';

export const metadata: Metadata = {
  title: 'Forgot Password - Ashinaga Scholar Portal',
  description: 'Reset your password for the Ashinaga Scholar Portal',
};

export default function ForgotPassword() {
  return <ForgotPasswordPage />;
}
