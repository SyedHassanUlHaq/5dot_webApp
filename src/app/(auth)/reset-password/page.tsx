'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { PasswordField } from '@/components/auth/PasswordField';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authRequest } from '@/lib/api/client';
import { MessageSchema } from '@/lib/api/schemas';
import { digitsOnly, resetSchema } from '@/lib/auth/forms';
import { usePendingAuth } from '@/lib/auth/pending';

type Values = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const pending = usePendingAuth();
  const { show, modal } = useErrorModal();
  const knownEmail = pending.get().resetEmail;
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { register, control, handleSubmit, getValues, formState } = useForm<Values>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: knownEmail ?? '', otp: '', newPassword: '', confirmPassword: '' },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (v) => {
      try {
        await authRequest('reset-password', MessageSchema, {
          email: v.email.trim(),
          otp: v.otp.trim(),
          newPassword: v.newPassword,
        });
        pending.setResetEmail(null);
        setSuccess(true);
        timer.current = setTimeout(() => router.push('/sign-in'), 1800);
      } catch (err) {
        show('Could not reset password', messageOf(err, 'Something went wrong. Please try again.'));
      }
    },
    (errs) => {
      if (errs.otp) show('Enter the code', 'Enter the 6-digit code we sent to your email.');
      else if (errs.newPassword)
        show('Password too short', 'Your new password must be at least 8 characters.');
      else if (errs.confirmPassword)
        show("Passwords don't match", 'Make sure both password fields match.');
    },
  );

  const resend = async () => {
    const email = getValues('email').trim();
    if (!email) return show('Enter your email', 'Enter your email address first.');
    setResending(true);
    try {
      await authRequest('forgot-password', MessageSchema, { email });
      show('Code sent', `A new code has been sent to ${email}.`, 'info');
    } catch {
      show('Could not resend', 'Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <h1 className="text-h1 font-bold">Check your email.</h1>
      <p className="mt-1 mb-6 text-ink-2">
        {knownEmail ? (
          <>
            Enter the 6-digit code we sent to <strong className="text-ink">{knownEmail}</strong> and
            choose a new password.
          </>
        ) : (
          'Enter your email, the 6-digit code we sent you, and choose a new password.'
        )}
      </p>
      {success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-input bg-authentic/15 p-4 font-semibold text-authentic-dark"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          Password reset, sign in with your new password.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {knownEmail ? (
            <input type="hidden" {...register('email')} />
          ) : (
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={e.email?.message}
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
                error={e.otp?.message}
                {...field}
                onChange={(ev) => field.onChange(digitsOnly(ev.target.value))}
              />
            )}
          />
          <PasswordField
            label="New password"
            autoComplete="new-password"
            error={e.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            error={e.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" fullWidth loading={formState.isSubmitting}>
            Reset password
          </Button>
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="w-full text-center text-[13px] font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending…' : "Didn't get a code? Resend"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-ink-2">
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
      {modal}
    </>
  );
}
