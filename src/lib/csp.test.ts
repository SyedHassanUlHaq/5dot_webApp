import { describe, expect, it } from 'vitest';
import { BASE_SECURITY_HEADERS, LEGAL_HTML_CSP, buildAppCsp, originOf } from './csp';

const dir = (csp: string, name: string) =>
  csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('buildAppCsp', () => {
  const csp = buildAppCsp({
    nonce: 'abc123',
    apiBase: 'https://api.axioware.tech/v1',
    production: true,
  });
  it('uses a nonce + strict-dynamic and never allows inline/eval scripts in production', () => {
    const s = dir(csp, 'script-src');
    expect(s).toContain("'nonce-abc123'");
    expect(s).toContain("'strict-dynamic'");
    expect(s).not.toContain("'unsafe-inline'");
    expect(s).not.toContain("'unsafe-eval'");
  });
  it('allows unsafe-eval only in dev', () => {
    expect(dir(buildAppCsp({ nonce: 'n', dev: true }), 'script-src')).toContain("'unsafe-eval'");
  });
  it('lets the browser reach the API origin for direct upload, and nothing broader', () => {
    const c = dir(csp, 'connect-src');
    expect(c).toContain('https://api.axioware.tech');
    expect(c).not.toContain('*');
  });
  it('allows Google/Apple sign-in hosts only where needed', () => {
    expect(dir(csp, 'frame-src')).toContain('https://accounts.google.com/gsi/');
    expect(dir(csp, 'script-src')).toContain('https://accounts.google.com/gsi/client');
  });
  it('locks down framing, plugins, base and forms', () => {
    expect(dir(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(dir(csp, 'object-src')).toBe("object-src 'none'");
    expect(dir(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(dir(csp, 'form-action')).toBe("form-action 'self'");
  });
  it('adds upgrade-insecure-requests only in production', () => {
    expect(csp).toContain('upgrade-insecure-requests');
    expect(buildAppCsp({ nonce: 'n' })).not.toContain('upgrade-insecure-requests');
  });
  it('does not allow Stripe (hosted Checkout is a redirect)', () =>
    expect(csp).not.toContain('stripe'));
  it('survives a missing/invalid API base', () => {
    expect(() => buildAppCsp({ nonce: 'n', apiBase: 'not a url' })).not.toThrow();
    expect(originOf('https://x.test/v1')).toBe('https://x.test');
  });
});

describe('static policies', () => {
  it('legal HTML CSP permits no scripts', () => {
    expect(LEGAL_HTML_CSP).toContain("default-src 'none'");
    expect(LEGAL_HTML_CSP).not.toMatch(/script-src/);
  });
  it('sets the baseline hardening headers', () => {
    const keys = BASE_SECURITY_HEADERS.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'X-Frame-Options',
      ]),
    );
  });
});
