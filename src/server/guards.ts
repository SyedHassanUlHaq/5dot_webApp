import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, errorBody } from '@/lib/api/errors';

export function jsonError(e: ApiError) {
  return NextResponse.json(errorBody(e), { status: e.statusCode });
}

/**
 * CSRF defence for mutating routes: SameSite=Lax cookies + a strict Origin check.
 * A request with no Origin header is rejected too (browsers always send it on POST/PATCH/DELETE).
 */
export function checkOrigin(req: NextRequest): ApiError | null {
  const origin = req.headers.get('origin');
  const allowed = new Set<string>([req.nextUrl.origin]);
  const configured = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (configured) allowed.add(configured.replace(/\/+$/, ''));
  if (!origin || !allowed.has(origin)) {
    return new ApiError('CSRF_BLOCKED', 'Request blocked.', 403);
  }
  return null;
}

// ── Fixed-window rate limiter (in-memory, per instance) ─────────────────────
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Number of trusted reverse proxies in front of the app (each appends the address it received the request from to X-Forwarded-For).
 * Examples: ALB only = 1 (default); CloudFront → ALB = 2; Vercel = 1 (it overwrites the header).
 * Set TRUSTED_PROXY_HOPS at runtime. 0 = never trust the header (everyone shares one rate-limit bucket).
 */
export function trustedProxyHops(raw: string | undefined = process.env.TRUSTED_PROXY_HOPS): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 1;
}

/**
 * The client IP is the entry `hops` from the END of X-Forwarded-For. Entries to the left of that can be forged by the client
 * (a proxy appends to whatever the client sent), so taking the first entry would let anyone dodge rate limits by rotating a fake value.
 */
export function ipFromForwardedFor(header: string | null, hops: number): string {
  if (hops <= 0 || !header) return 'unknown';
  const parts = header
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  return parts[Math.max(0, parts.length - hops)]!.slice(0, 64);
}

export function clientIp(req: NextRequest): string {
  return ipFromForwardedFor(req.headers.get('x-forwarded-for'), trustedProxyHops());
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): ApiError | null {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return null;
  }
  b.count += 1;
  if (b.count > max) {
    return new ApiError(
      'RATE_LIMITED',
      'Too many attempts. Please wait a minute and try again.',
      429,
    );
  }
  return null;
}

export function _resetRateLimits() {
  buckets.clear();
}
