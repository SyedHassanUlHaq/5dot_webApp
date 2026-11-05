'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PasswordField } from '@/components/auth/PasswordField';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authRequest } from '@/lib/api/client';
import { MessageSchema } from '@/lib/api/schemas';
import { signUpSchema } from '@/lib/auth/forms';
import { usePendingAuth } from '@/lib/auth/pending';

type Values = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const pending = usePendingAuth();
  const { show, modal } = useErrorModal();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(signUpSchema),
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (v) => {
      const body = {
        email: v.email.trim(),
        password: v.password,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phoneNumber: v.phoneNumber?.trim() || undefined,
      };
      try {
        await authRequest('signup', MessageSchema, body);
        pending.setSignup(body);
        router.push('/verify');
      } catch (err) {
        show('Sign up failed', messageOf(err, 'Could not create your account. Please try again.'));
      }
    },
    (errs) => {
      if (errs.password?.type === 'too_small')
        show('Password too short', 'Password must be at least 8 characters.');
      else if (errs.confirmPassword)
        show("Passwords don't match", 'Make sure both password fields match.');
      else show('Missing details', 'Please fill in your name, email, and password.');
    },
  );

  return (
    <>
      <h1 className="text-h1 font-bold">Create your account.</h1>
      <p className="mt-1 mb-6 text-ink-2">20 free analyses every month. No card required.</p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            autoComplete="given-name"
            error={e.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            error={e.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={e.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          {...register('phoneNumber')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="Must be at least 8 characters"
          error={e.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={e.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth loading={formState.isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-caption text-ink-2">
        By creating an account, you agree to our{' '}
        <Link href="/legal/terms" className="font-semibold text-brand hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-6 text-center text-ink-2">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
      {modal}
    </>
  );
}
