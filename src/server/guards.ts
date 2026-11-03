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

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
