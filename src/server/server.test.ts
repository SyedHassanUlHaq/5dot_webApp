// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAuth } from './auth-handler';
import { _resetRateLimits, checkOrigin, rateLimit } from './guards';
import { handleProxy, isAllowedPath } from './proxy-handler';
import { _resetRefreshCache, refreshTokens } from './refresh';

const ORIGIN = 'http://localhost:3000';
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.test/v1';

const user = {
  id: 'u1',
  email: 'a@b.c',
  name: 'A B',
  firstName: 'A',
  lastName: 'B',
  phoneNumber: null,
  avatarInitials: 'AB',
  avatarColor: '#fff',
  plan: 'free',
  modelVersion: 'x',
  scansUsedThisMonth: 0,
  scansLimitThisMonth: 3,
  planResetDate: 'd',
  createdAt: 'd',
};
const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function req(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookies?: string;
    origin?: string | null;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = { ...init.headers };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookies) headers.cookie = init.cookies;
  if (init.body !== undefined) headers['content-type'] ??= 'application/json';
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body),
  });
}

const setCookies = (res: Response) => res.headers.getSetCookie();
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  _resetRateLimits();
  _resetRefreshCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('guards', () => {
  it('rejects missing or foreign Origin', () => {
    expect(checkOrigin(req('/x', { method: 'POST', origin: null }))?.statusCode).toBe(403);
    expect(checkOrigin(req('/x', { method: 'POST', origin: 'https://evil.com' }))?.statusCode).toBe(
      403,
    );
    expect(checkOrigin(req('/x', { method: 'POST' }))).toBeNull();
  });
  it('rate limits after max in window and resets', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 1000, 0)).toBeNull();
    expect(rateLimit('k', 3, 1000, 10)?.statusCode).toBe(429);
    expect(rateLimit('k', 3, 1000, 2000)).toBeNull();
  });
});

describe('auth BFF', () => {
  it('signin: sets httpOnly cookies and never returns tokens to JS', async () => {
    fetchMock.mockResolvedValueOnce(j({ accessToken: 'AT123', refreshToken: 'RT456', user }));
    const res = await handleAuth(
      req('/api/auth/signin', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } }),
      'signin',
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('AT123');
    expect(text).not.toContain('RT456');
    expect(JSON.parse(text).user.id).toBe('u1');
    const cookies = setCookies(res).join('\n');
    expect(cookies).toMatch(/5dot_rt=RT456.*HttpOnly.*SameSite=lax/i);
    expect(cookies).toMatch(/5dot_at=AT123.*HttpOnly/i);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/v1/auth/signin');
  });
  it('blocks cross-origin POST before calling the backend', async () => {
    const res = await handleAuth(
      req('/api/auth/signin', { method: 'POST', origin: 'https://evil.com', body: {} }),
      'signin',
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('validates input with Zod', async () => {
    const res = await handleAuth(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'a@b.c', password: 'short', firstName: 'A', lastName: 'B' },
      }),
      'signup',
    );
    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('forwards backend errors in the standard envelope', async () => {
    fetchMock.mockResolvedValueOnce(j({ detail: 'Invalid credentials' }, 401));
    const res = await handleAuth(
      req('/api/auth/signin', { method: 'POST', body: { email: 'a@b.c', password: 'x' } }),
      'signin',
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe('Invalid credentials');
    expect(setCookies(res)).toHaveLength(0);
  });
  it('rate limits repeated attempts', async () => {
    fetchMock.mockImplementation(async () => j({ detail: 'no' }, 401));
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (
        await handleAuth(
          req('/api/auth/signin', {
            method: 'POST',
            body: { email: 'a@b.c', password: 'x' },
            headers: { 'x-forwarded-for': '1.2.3.4' },
          }),
          'signin',
        )
      ).status;
    }
    expect(last).toBe(429);
  });
  it('signout clears cookies even if the backend call fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    const res = await handleAuth(
      req('/api/auth/signout', { method: 'POST', cookies: '5dot_rt=RT' }),
      'signout',
    );
    expect(res.status).toBe(200);
    expect(setCookies(res).join('\n')).toMatch(/5dot_rt=;.*Max-Age=0/i);
  });
  it('unknown action is 404', async () => {
    expect(
      (await handleAuth(req('/api/auth/nope', { method: 'POST', body: {} }), 'nope')).status,
    ).toBe(404);
  });
});

describe('refreshTokens', () => {
  it('shares one backend call between concurrent callers', async () => {
    fetchMock.mockResolvedValue(j({ accessToken: 'A2', refreshToken: 'R2' }));
    const [a, b, c] = await Promise.all([
      refreshTokens('R1'),
      refreshTokens('R1'),
      refreshTokens('R1'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(c).toEqual({ status: 'ok', tokens: { accessToken: 'A2', refreshToken: 'R2' } });
  });
  it('distinguishes invalid token from backend outage', async () => {
    fetchMock.mockResolvedValueOnce(j({ detail: 'bad' }, 401));
    expect(await refreshTokens('Rx')).toEqual({ status: 'invalid' });
    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 502 }));
    expect(await refreshTokens('Ry')).toEqual({ status: 'unavailable' });
  });
  it('does not cache transient failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('net'));
    expect((await refreshTokens('Rz')).status).toBe('unavailable');
    await Promise.resolve();
    fetchMock.mockResolvedValueOnce(j({ accessToken: 'A', refreshToken: 'R' }));
    expect((await refreshTokens('Rz')).status).toBe('ok');
  });
});

describe('proxy', () => {
  it('only allows known backend areas and safe segments', () => {
    expect(isAllowedPath(['scans', 'history'])).toBe(true);
    expect(isAllowedPath(['auth', 'signin'])).toBe(false);
    expect(isAllowedPath(['scans', '..', 'auth'])).toBe(false);
    expect(isAllowedPath([])).toBe(false);
  });
  it('401 without a refresh cookie → SESSION_EXPIRED + cleared cookies', async () => {
    const res = await handleProxy(req('/api/proxy/users/me'), ['users', 'me']);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('SESSION_EXPIRED');
    expect(setCookies(res).join()).toMatch(/Max-Age=0/i);
  });
  it('attaches the bearer token from the cookie', async () => {
    fetchMock.mockResolvedValueOnce(j({ ok: 1 }));
    const res = await handleProxy(
      req('/api/proxy/stats/weekly?x=1', { cookies: '5dot_rt=R; 5dot_at=AT' }),
      ['stats', 'weekly'],
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/v1/stats/weekly?x=1');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer AT');
  });
  it('on 401 refreshes once, retries, and rotates cookies', async () => {
    fetchMock
      .mockResolvedValueOnce(j({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(j({ accessToken: 'AT2', refreshToken: 'RT2' }))
      .mockResolvedValueOnce(j({ done: true }));
    const res = await handleProxy(
      req('/api/proxy/users/me', {
        method: 'PATCH',
        body: { name: 'N' },
        cookies: '5dot_rt=RT1; 5dot_at=OLD',
      }),
      ['users', 'me'],
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ done: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Headers(fetchMock.mock.calls[2]![1].headers).get('authorization')).toBe(
      'Bearer AT2',
    );
    expect(setCookies(res).join('\n')).toMatch(/5dot_rt=RT2/);
  });
  it('refreshes proactively when the access cookie is gone', async () => {
    fetchMock
      .mockResolvedValueOnce(j({ accessToken: 'AT9', refreshToken: 'RT9' }))
      .mockResolvedValueOnce(j({ ok: true }));
    const res = await handleProxy(req('/api/proxy/plans', { cookies: '5dot_rt=RTx' }), ['plans']);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('dead refresh token → SESSION_EXPIRED', async () => {
    fetchMock
      .mockResolvedValueOnce(j({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(j({ detail: 'bad' }, 401));
    const res = await handleProxy(
      req('/api/proxy/users/me', { cookies: '5dot_rt=dead; 5dot_at=A' }),
      ['users', 'me'],
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('SESSION_EXPIRED');
  });
  it('backend outage during refresh keeps the session (503, no cookie clearing)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }));
    const res = await handleProxy(req('/api/proxy/users/me', { cookies: '5dot_rt=R502' }), [
      'users',
      'me',
    ]);
    expect(res.status).toBe(503);
    expect(setCookies(res)).toHaveLength(0);
  });
  it('mutations require a same-origin Origin header', async () => {
    const res = await handleProxy(
      req('/api/proxy/users/me', {
        method: 'DELETE',
        origin: 'https://evil.com',
        cookies: '5dot_rt=R; 5dot_at=A',
      }),
      ['users', 'me'],
    );
    expect(res.status).toBe(403);
  });
  it('passes 204 through with no body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await handleProxy(
      req('/api/proxy/users/me', { method: 'DELETE', cookies: '5dot_rt=R; 5dot_at=A' }),
      ['users', 'me'],
    );
    expect(res.status).toBe(204);
  });
});
