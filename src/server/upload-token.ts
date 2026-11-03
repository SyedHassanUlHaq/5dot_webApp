import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { clientIp, jsonError, rateLimit } from './guards';
import { refreshTokens } from './refresh';
import { AT_COOKIE, clearSession, RT_COOKIE, setSession } from './session';

/**
 * Hands the browser the current access token so it can upload a large file DIRECTLY to the backend
 * (serverless hosts cap request bodies at a few MB; the app allows 125 MB). This is the one place JS sees a token.
 * Mitigations: POST + Origin check (done by caller), per-IP rate limit, no-store, and the token is the normal
 * 1h access token (the refresh token never leaves the httpOnly cookie).
 */
export async function handleUploadToken(req: NextRequest): Promise<NextResponse> {
  const limited = rateLimit(`upload-token:${clientIp(req)}`, 30, 60_000);
  if (limited) return jsonError(limited);

  const rt = req.cookies.get(RT_COOKIE)?.value;
  if (!rt) return expired();

  let at = req.cookies.get(AT_COOKIE)?.value;
  let rotated = null;
  if (!at) {
    const r = await refreshTokens(rt);
    if (r.status === 'invalid') return expired();
    if (r.status === 'unavailable') {
      return jsonError(
        new ApiError(
          'SERVICE_UNAVAILABLE',
          'The server is temporarily unavailable. Please try again in a moment.',
          503,
        ),
      );
    }
    rotated = r.tokens;
    at = r.tokens.accessToken;
  }
  const out = NextResponse.json({ accessToken: at }, { headers: { 'Cache-Control': 'no-store' } });
  if (rotated) setSession(out, rotated);
  return out;
}

function expired() {
  const res = jsonError(
    new ApiError('SESSION_EXPIRED', 'Your session expired. Please sign in again.', 401),
  );
  clearSession(res);
  return res;
}
