'use client';
import { createContext, useContext, useMemo, useRef } from 'react';

export interface PendingSignup {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}
interface Pending {
  signup: PendingSignup | null;
  /** email carried between forgot-password → reset-password */
  resetEmail: string | null;
}

/**
 * In-memory hand-off between auth pages (the mobile app passes these as navigation params).
 * Deliberately NOT in storage or the URL: it holds the password until the OTP step so "resend code" can re-submit the signup.
 * A page reload clears it; screens then fall back to asking for the email.
 */
const Ctx = createContext<React.MutableRefObject<Pending> | null>(null);

export function PendingAuthProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<Pending>({ signup: null, resetEmail: null });
  return <Ctx.Provider value={ref}>{children}</Ctx.Provider>;
}

export function usePendingAuth() {
  const ref = useContext(Ctx);
  if (!ref) throw new Error('usePendingAuth outside PendingAuthProvider');
  return useMemo(
    () => ({
      get: () => ref.current,
      setSignup: (s: PendingSignup | null) => void (ref.current.signup = s),
      setResetEmail: (e: string | null) => void (ref.current.resetEmail = e),
    }),
    [ref],
  );
}
