/**
 * Content-Security-Policy builders. Pure functions so they can be unit-tested.
 *
 * App pages: per-request nonce + 'strict-dynamic' (no 'unsafe-inline' for scripts). Third-party hosts are only what
 * Google Identity Services and Sign in with Apple need. Stripe is NOT listed: billing will use hosted Checkout (a redirect),
 * which needs no script/frame allowance on our pages.
 */
export function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

export function buildAppCsp(opts: {
  nonce: string;
  apiBase?: string;
  dev?: boolean;
  production?: boolean;
}): string {
  const api = originOf(opts.apiBase);
  const d: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${opts.nonce}'`,
      "'strict-dynamic'", // lets our nonced bundle load GIS / Apple JS; host entries below are the CSP2 fallback
      'https://accounts.google.com/gsi/client',
      'https://appleid.cdn-apple.com',
      ...(opts.dev ? ["'unsafe-eval'"] : []), // React dev tooling only
    ],
    // React inline style={{}} attributes and Google's injected button styles need 'unsafe-inline' for styles (not scripts).
    'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://i.ytimg.com',
      'https://*.ytimg.com',
      'https://*.googleusercontent.com',
      'https://*.gstatic.com',
    ],
    'font-src': ["'self'"],
    // api origin: direct-to-backend file upload (see docs/architecture.md)
    'connect-src': [
      "'self'",
      ...(api ? [api] : []),
      'https://accounts.google.com/gsi/',
      'https://appleid.apple.com',
    ],
    'frame-src': ['https://accounts.google.com/gsi/', 'https://appleid.apple.com'],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const parts = Object.entries(d).map(([k, v]) => `${k} ${v.join(' ')}`);
  if (opts.production) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/** The verbatim legal HTML pages are self-contained documents: one inline <style> and Google Fonts, no scripts at all. */
export const LEGAL_HTML_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const LEGAL_HTML_PATHS = ['/privacy', '/support', '/delete-account'];

/** Applied to every response via next.config.ts. */
export const BASE_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Google's sign-in popup needs window.opener access back to us.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];
export const HSTS = {
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains',
};
