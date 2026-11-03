'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { apiRequest, authRequest } from '@/lib/api/client';
import { UserSchema, type User } from '@/lib/api/schemas';

export const ME_KEY = ['me'] as const;
export const AuthUserResponse = z.object({ user: UserSchema });

/** Current user from the BFF. A dead session redirects to /sign-in?reason=expired (see api client). */
export function useMe(enabled = true) {
  return useQuery({ queryKey: ME_KEY, queryFn: () => apiRequest('users/me', UserSchema), enabled });
}

export function useSetUser() {
  const qc = useQueryClient();
  return useCallback((u: User) => qc.setQueryData(ME_KEY, u), [qc]);
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    try {
      await authRequest('signout', z.unknown());
    } catch {
      // cookies are cleared server-side regardless; proceed
    }
    qc.clear();
    router.replace('/sign-in');
  }, [qc, router]);
}

// ── Terms acceptance ─ same model as mobile: a local per-user flag, no backend field ──
const TERMS_KEY_PREFIX = '5dot_terms_accepted_';

export function useTerms(userId: string | undefined) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) return;
    try {
      setAccepted(localStorage.getItem(TERMS_KEY_PREFIX + userId) === 'true');
    } catch {
      setAccepted(false);
    }
  }, [userId]);
  const accept = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.setItem(TERMS_KEY_PREFIX + userId, 'true');
    } catch {
      // storage blocked: acceptance only lasts this page view
    }
    setAccepted(true);
  }, [userId]);
  return { accepted, accept };
}
