'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { AppleButton, GoogleButton, type AppleResult } from '@/components/auth/SocialButtons';
import { PasswordField } from '@/components/auth/PasswordField';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authRequest } from '@/lib/api/client';
import { signInSchema, safeNext } from '@/lib/auth/forms';
import { AuthUserResponse, useSetUser } from '@/lib/auth/session';

type Values = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useSetUser();
  const { show, modal } = useErrorModal();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(signInSchema),
  });

  const reason = params.get('reason');
  useEffect(() => {
    if (reason === 'expired') show('Signed out', 'Your session expired. Please sign in again.');
  }, [reason, show]);

  const done = (user: z.infer<typeof AuthUserResponse>['user']) => {
    setUser(user);
    router.replace(safeNext(params.get('next')));
  };

  const onSubmit = handleSubmit(
    async (v) => {
      try {
        done(
          (
            await authRequest('signin', AuthUserResponse, {
              email: v.email.trim(),
              password: v.password,
            })
          ).user,
        );
      } catch (e) {
        show('Sign in failed', messageOf(e, 'Could not sign in. Please try again.'));
      }
    },
    () => show('Missing details', 'Please enter your email and password.'),
  );

  const google = async (idToken: string) => {
    try {
      done((await authRequest('google', AuthUserResponse, { idToken })).user);
    } catch (e) {
      show(
        'Google sign-in failed',
        messageOf(e, 'Could not sign in with Google. Please try again.'),
      );
    }
  };
  const apple = async (r: AppleResult) => {
    try {
      done((await authRequest('apple', AuthUserResponse, r)).user);
    } catch (e) {
      show('Apple sign-in failed', messageOf(e, 'Could not sign in with Apple. Please try again.'));
    }
  };

  return (
    <>
      <h1 className="text-h1 font-bold">Welcome back.</h1>
      <p className="mt-1 mb-6 text-ink-2">Sign in to continue verifying media.</p>

      <div className="space-y-3">
        <GoogleButton onIdToken={google} onError={(m) => show('Google sign-in failed', m)} />
        <AppleButton onResult={apple} onError={(m) => show('Apple sign-in failed', m)} />
      </div>
      <div
        className="my-5 flex items-center gap-3 text-label font-semibold tracking-[1.2px] text-ink-2"
        aria-hidden
      >
        <span className="h-px flex-1 bg-line" />
        OR
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Password"
          {...register('password')}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-[13px] font-semibold text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth loading={formState.isSubmitting}>
          {formState.isSubmitting ? 'Signing in...' : 'Sign in →'}
        </Button>
      </form>

      <p className="mt-6 text-center text-ink-2">
        New to 5dot?{' '}
        <Link href="/sign-up" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
      {modal}
    </>
  );
}
