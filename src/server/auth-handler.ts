import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { AuthResponseSchema, MessageSchema } from '@/lib/api/schemas';
import { apiBase } from './env';
import { checkOrigin, clientIp, jsonError, rateLimit } from './guards';
import { clearSession, RT_COOKIE, setSession } from './session';
import { handleUploadToken } from './upload-token';

const email = z.string().trim().min(1).max(254);
const otp = z.string().trim().length(6);

/** Zod validation at the BFF boundary. Each action maps to a backend path. */
const actions = {
  signup: {
    path: '/auth/signup',
    kind: 'message',
    body: z.object({
      email,
      password: z.string().min(8).max(256),
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      phoneNumber: z.string().trim().max(32).optional(),
    }),
  },
  verify: { path: '/auth/signup/verify', kind: 'session', body: z.object({ email, otp }) },
  signin: {
    path: '/auth/signin',
    kind: 'session',
    body: z.object({ email, password: z.string().min(1).max(256) }),
  },
  google: {
    path: '/auth/google',
    kind: 'session',
    body: z.object({ idToken: z.string().min(10) }),
  },
  apple: {
    path: '/auth/apple',
    kind: 'session',
    body: z.object({
      identityToken: z.string().min(10),
      authorizationCode: z.string().nullish(),
      email: z.string().nullish(),
      firstName: z.string().nullish(),
      lastName: z.string().nullish(),
    }),
  },
  'forgot-password': { path: '/auth/forgot-password', kind: 'message', body: z.object({ email }) },
  'reset-password': {
    path: '/auth/reset-password',
    kind: 'message',
    body: z.object({ email, otp, newPassword: z.string().min(8).max(256) }),
  },
} as const;

type ActionName = keyof typeof actions;
const isAction = (a: string): a is ActionName => Object.hasOwn(actions, a);

async function backendPost(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(
      'NETWORK_TIMEOUT',
      'Could not reach the server. Please check your connection and try again.',
      504,
    );
  }
}

export async function handleAuth(req: NextRequest, action: string): Promise<NextResponse> {
  const csrf = checkOrigin(req);
  if (csrf) return jsonError(csrf);

  try {
    if (action === 'signout') return await signout(req);
    if (action === 'upload-token') return await handleUploadToken(req);
    if (!isAction(action)) return jsonError(new ApiError('NOT_FOUND', 'Not found.', 404));

    const limited = rateLimit(`${action}:${clientIp(req)}`, 10, 60_000);
    if (limited) return jsonError(limited);

    const cfg = actions[action];
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError(new ApiError('BAD_REQUEST', 'Invalid request.', 400));
    }
    const input = cfg.body.safeParse(raw);
    if (!input.success) {
      return jsonError(
        new ApiError('VALIDATION_ERROR', 'Please check the details you entered.', 422),
      );
    }

    const res = await backendPost(cfg.path, input.data);
    if (!res.ok) return jsonError(await parseApiError(res));
    const data: unknown = await res.json();

    if (cfg.kind === 'message') {
      const m = MessageSchema.safeParse(data);
      return NextResponse.json({ message: m.success ? m.data.message : 'OK' });
    }

    const auth = AuthResponseSchema.safeParse(data);
    if (!auth.success) {
      return jsonError(new ApiError('BAD_RESPONSE', 'Unexpected response from the server.', 502));
    }
    // Tokens go into httpOnly cookies and are NOT returned to browser JS.
    const out = NextResponse.json({ user: auth.data.user });
    setSession(out, auth.data);
    return out;
  } catch (e) {
    if (e instanceof ApiError) return jsonError(e);
    return jsonError(new ApiError('INTERNAL', 'Something went wrong.', 500)); // never log tokens/PII
  }
}

async function signout(req: NextRequest): Promise<NextResponse> {
  const rt = req.cookies.get(RT_COOKIE)?.value;
  if (rt) {
    try {
      await backendPost('/auth/signout', { refreshToken: rt });
    } catch {
      // always clear locally even if the network fails
    }
  }
  const out = NextResponse.json({ ok: true });
  clearSession(out);
  return out;
}
