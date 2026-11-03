import { Suspense } from 'react';
import { SignInForm } from './SignInForm';

export const metadata = { title: 'Sign in · 5dot' };

export default function Page() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
