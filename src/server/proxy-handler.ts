import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { apiBase } from './env';
import { checkOrigin, jsonError } from './guards';
import { refreshTokens } from './refresh';
import { AT_COOKIE, clearSession, RT_COOKIE, setSession } from './session';
import type { Tokens } from '@/lib/api/schemas';

/** Only these backend areas are reachable through the proxy (auth goes through /api/auth/*). */
const ALLOWED = new Set(['scans', 'users', 'stats', 'plans', 'feedback', 'notifications']);
const SAFE_METHODS = new Set(['GET', 'HEAD']);
const FORWARD_REQ_HEADERS = ['content-type', 'accept'];
const FORWARD_RES_HEADERS = [
  'content-type',
  'content-disposition',
  'content-length',
  'cache-control',
];

export function isAllowedPath(segments: string[]): boolean {
  if (segments.length === 0) return false;
  if (segments.some((s) => !s || s === '.' || s === '..' || /[\\/]/.test(s))) return false;
  return ALLOWED.has(segments[0]!);
}

const expired = () => {
  const res = jsonError(
    new ApiError('SESSION_EXPIRED', 'Your session expired. Please sign in again.', 401),
  );
  clearSession(res);
  return res;
};

export async function handleProxy(req: NextRequest, segments: string[]): Promise<NextResponse> {
  if (!SAFE_METHODS.has(req.method)) {
    const csrf = checkOrigin(req);
    if (csrf) return jsonError(csrf);
  }
  if (!isAllowedPath(segments)) return jsonError(new ApiError('NOT_FOUND', 'Not found.', 404));

  const rt = req.cookies.get(RT_COOKIE)?.value;
  if (!rt) return expired();

  let at = req.cookies.get(AT_COOKIE)?.value;
  let rotated: Tokens | null = null;

  const refresh = async (): Promise<NextResponse | null> => {
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
    return null;
  };

  // Access cookie expired (1h) → refresh proactively.
  if (!at) {
    const fail = await refresh();
    if (fail) return fail;
  }

  const hasBody = !SAFE_METHODS.has(req.method);
  const isMultipart = (req.headers.get('content-type') ?? '').startsWith('multipart/');
  // Multipart bodies are streamed (not replayable → no retry). Everything else is buffered so we can retry once.
  const streamed = hasBody && isMultipart;
  const buffered = hasBody && !streamed ? await req.arrayBuffer() : undefined;

  const url = `${apiBase()}/${segments.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const send = async (): Promise<Response> => {
    const headers = new Headers();
    for (const h of FORWARD_REQ_HEADERS) {
      const v = req.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('Authorization', `Bearer ${at}`);
    const init: RequestInit & { duplex?: 'half' } = { method: req.method, headers };
    if (streamed) {
      init.body = req.body;
      init.duplex = 'half';
    } else if (buffered) {
      init.body = buffered;
    }
    try {
      return await fetch(url, init);
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NETWORK_TIMEOUT',
            message: 'Could not reach the server. Please check your connection and try again.',
            statusCode: 504,
          },
        }),
        { status: 504, headers: { 'content-type': 'application/json' } },
      );
    }
  };

  let upstream = await send();
  if (upstream.status === 401 && !rotated) {
    const fail = await refresh();
    if (fail) return fail;
    if (!streamed) upstream = await send();
  }

  const headers = new Headers();
  for (const h of FORWARD_RES_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  const nullBody = upstream.status === 204 || upstream.status === 205 || upstream.status === 304;
  const out = new NextResponse(nullBody ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
  if (rotated) setSession(out, rotated);
  return out;
}
