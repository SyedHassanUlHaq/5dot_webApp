import '@/lib/zod-config';
import { z } from 'zod';

/** Client-side form schemas. Messages mirror mobile's validation copy. */
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Please enter your email and password.'),
  password: z.string().min(1, 'Please enter your email and password.'),
});

const password8 = z.string().min(8, 'Password must be at least 8 characters.');
const otp6 = z.string().trim().length(6, 'Enter the 6-digit code we sent to your email.');

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Required'),
    lastName: z.string().trim().min(1, 'Required'),
    email: z.string().trim().min(1, 'Required').email('Enter a valid email address.'),
    phoneNumber: z.string().trim().optional(),
    password: password8,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });

export const verifySchema = z.object({
  email: z.string().trim().min(1, 'Required').email('Enter a valid email address.'),
  otp: otp6,
});

export const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
});

export const resetSchema = z
  .object({
    email: z.string().trim().min(1, 'Required').email('Enter a valid email address.'),
    otp: otp6,
    newPassword: z.string().min(8, 'Your new password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });

export const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 6);

/** Open-redirect safe `next` param: same-origin absolute paths only. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  return next;
}
