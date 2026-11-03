// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from './middleware';

const run = (path: string, signedIn: boolean) =>
  middleware(
    new NextRequest(`http://localhost:3000${path}`, {
      headers: signedIn ? { cookie: '5dot_rt=x' } : {},
    }),
  );
const location = (r: Response) => r.headers.get('location');

describe('middleware', () => {
  it.each([
    '/privacy',
    '/support',
    '/delete-account',
    '/legal/terms',
    '/legal/cookies',
    '/sign-in',
    '/sign-up',
  ])('%s is reachable when signed out', (p) => expect(location(run(p, false))).toBeNull());
  it.each([
    '/',
    '/scan',
    '/scan/abc',
    '/history',
    '/plans',
    '/profile',
    '/account/delete',
    '/feedback',
  ])('%s redirects signed-out users to sign-in', (p) =>
    expect(location(run(p, false))).toContain('/sign-in'),
  );
  it('remembers where the user was going', () => {
    expect(location(run('/history', false))).toContain('next=%2Fhistory');
    expect(location(run('/', false))).not.toContain('next=');
  });
  it('sends signed-in users away from auth pages', () => {
    expect(location(run('/sign-in', true))).toBe('http://localhost:3000/');
    expect(location(run('/forgot-password', true))).toBe('http://localhost:3000/');
  });
  it('lets signed-in users view legal pages', () =>
    expect(location(run('/legal/terms', true))).toBeNull());
});

describe('CSP', () => {
  const csp = (path: string) => run(path, true).headers.get('content-security-policy') ?? '';
  it('every app page gets a nonce-based policy', () => {
    const c = csp('/history');
    expect(c).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(c).not.toMatch(/script-src [^;]*'unsafe-inline'/);
  });
  it('uses a fresh nonce per request', () => {
    const n = (c: string) => /'nonce-([^']+)'/.exec(c)?.[1];
    expect(n(csp('/history'))).not.toBe(n(csp('/history')));
  });
  it('the verbatim legal HTML pages get the script-free policy', () => {
    for (const p of ['/privacy', '/support', '/delete-account']) {
      const c = run(p, false).headers.get('content-security-policy') ?? '';
      expect(c).toContain("default-src 'none'");
      expect(c).not.toContain('script-src');
    }
  });
});
