import 'server-only';
import type { NextResponse } from 'next/server';
import type { Tokens } from '@/lib/api/schemas';

/** httpOnly cookies — browser JS never sees either token. */
export const RT_COOKIE = '5dot_rt';
export const AT_COOKIE = '5dot_at';

const base = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

export function setSession(res: NextResponse, t: Tokens) {
  // Refresh token lives 30d. Path "/" so middleware can see the session exists.
  res.cookies.set(RT_COOKIE, t.refreshToken, { ...base, path: '/', maxAge: 30 * 24 * 3600 });
  // Access token lives 1h on the backend; expire the cookie a bit early. Only sent to /api.
  res.cookies.set(AT_COOKIE, t.accessToken, { ...base, path: '/api', maxAge: 55 * 60 });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(RT_COOKIE, '', { ...base, path: '/', maxAge: 0 });
  res.cookies.set(AT_COOKIE, '', { ...base, path: '/api', maxAge: 0 });
}
