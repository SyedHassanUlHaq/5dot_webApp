'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authRequest } from '@/lib/api/client';
import { MessageSchema } from '@/lib/api/schemas';
import { forgotSchema } from '@/lib/auth/forms';
import { usePendingAuth } from '@/lib/auth/pending';

type Values = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const pending = usePendingAuth();
  const { show, modal } = useErrorModal();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = handleSubmit(async (v) => {
    const email = v.email.trim();
    try {
      await authRequest('forgot-password', MessageSchema, { email });
      pending.setResetEmail(email);
      router.push('/reset-password');
    } catch (e) {
      show('Could not send code', messageOf(e, 'Please check your connection and try again.'));
    }
  });

  return (
    <>
      <h1 className="text-h1 font-bold">Forgot password?</h1>
      <p className="mt-1 mb-6 text-ink-2">
        Enter your email and we&apos;ll send you a 6-digit code to reset it.
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth loading={formState.isSubmitting}>
          {formState.isSubmitting ? 'Sending code…' : 'Send code'}
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-2">
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
      {modal}
    </>
  );
}
