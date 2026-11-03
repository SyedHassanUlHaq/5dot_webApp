'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authRequest } from '@/lib/api/client';
import { MessageSchema } from '@/lib/api/schemas';
import { digitsOnly, verifySchema } from '@/lib/auth/forms';
import { usePendingAuth } from '@/lib/auth/pending';
import { AuthUserResponse, useSetUser } from '@/lib/auth/session';

type Values = z.infer<typeof verifySchema>;

export default function VerifyPage() {
  const router = useRouter();
  const pending = usePendingAuth();
  const setUser = useSetUser();
  const { show, modal } = useErrorModal();
  const signup = pending.get().signup;
  const [resending, setResending] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: signup?.email ?? '', otp: '' },
  });

  const onSubmit = handleSubmit(
    async (v) => {
      try {
        const { user } = await authRequest('verify', AuthUserResponse, {
          email: v.email.trim(),
          otp: v.otp.trim(),
        });
        pending.setSignup(null); // drop the held password as soon as it's no longer needed
        setUser(user);
        router.replace('/'); // → terms gate for a new account
      } catch (e) {
        show('Verification failed', messageOf(e, 'That code did not work. Please try again.'));
      }
    },
    (errs) => {
      if (errs.otp) show('Enter the code', 'Enter the 6-digit code we sent to your email.');
    },
  );

  const resend = async () => {
    if (!signup) {
      // Resending re-submits the signup, which needs the details we deliberately don't persist.
      router.push('/sign-up');
      return;
    }
    setResending(true);
    try {
      await authRequest('signup', MessageSchema, signup);
      show('Code sent', `A new code has been sent to ${signup.email}.`, 'info');
    } catch (e) {
      show('Could not resend', messageOf(e, 'Please try again in a moment.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <h1 className="text-h1 font-bold">Verify your email.</h1>
      <p className="mt-1 mb-6 text-ink-2">
        {signup ? (
          <>
            Enter the 6-digit code we sent to <strong className="text-ink">{signup.email}</strong>{' '}
            to finish creating your account.
          </>
        ) : (
          'Enter the email you signed up with and the 6-digit code we sent you.'
        )}
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {signup ? (
          <input type="hidden" {...register('email')} />
        ) : (
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register('email')}
          />
        )}
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <Input
              label="Verification code"
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="[&_input]:text-center [&_input]:text-h2 [&_input]:tracking-[0.5em]"
              error={formState.errors.otp?.message}
              {...field}
              onChange={(e) => field.onChange(digitsOnly(e.target.value))}
            />
          )}
        />
        <Button type="submit" fullWidth loading={formState.isSubmitting}>
          Verify and continue
        </Button>
      </form>
      <button
        type="button"
        onClick={resend}
        disabled={resending}
        className="mt-5 w-full text-center text-[13px] font-semibold text-brand hover:underline disabled:opacity-60"
      >
        {resending ? 'Sending…' : "Didn't get a code? Resend"}
      </button>
      <p className="mt-4 text-center text-ink-2">
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
      {modal}
    </>
  );
}
