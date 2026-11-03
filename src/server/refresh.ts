import 'server-only';
import { TokensSchema, type Tokens } from '@/lib/api/schemas';
import { apiBase } from './env';

export type RefreshResult =
  | { status: 'ok'; tokens: Tokens }
  | { status: 'invalid' } // refresh token rejected → session is over
  | { status: 'unavailable' }; // backend/network trouble → keep the session, try later

/**
 * Single-flight refresh keyed by refresh token: concurrent requests carrying the same
 * (soon to be rotated) token share one backend call, mirroring the queue in mobile api.ts.
 * The result is kept for a few seconds so slightly-late requests that still hold the old
 * token reuse it instead of replaying a rotated-out token.
 * NOTE: in-memory → per server instance. Multi-instance deploys may rarely race; see docs/auth.md.
 */
const inflight = new Map<string, Promise<RefreshResult>>();
const KEEP_MS = 10_000;

export function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;
  const p = doRefresh(refreshToken);
  inflight.set(refreshToken, p);
  const t = setTimeout(() => inflight.delete(refreshToken), KEEP_MS);
  t.unref?.();
  // Don't cache transient failures.
  void p.then((r) => {
    if (r.status === 'unavailable') inflight.delete(refreshToken);
  });
  return p;
}

async function doRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
      return { status: 'invalid' };
    }
    if (!res.ok) return { status: 'unavailable' };
    const parsed = TokensSchema.safeParse(await res.json());
    return parsed.success ? { status: 'ok', tokens: parsed.data } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** test helper */
export function _resetRefreshCache() {
  inflight.clear();
}
