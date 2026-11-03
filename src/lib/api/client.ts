import type { z } from 'zod';
import { ApiError, parseApiError } from './errors';

/** Browser-side client. Talks only to our own BFF (/api/proxy, /api/auth); never sees tokens. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  init: { method?: string; json?: unknown; body?: BodyInit; signal?: AbortSignal } = {},
): Promise<z.output<S>> {
  const res = await rawRequest(`/api/proxy/${path.replace(/^\/+/, '')}`, init);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success)
    throw new ApiError('BAD_RESPONSE', 'Unexpected response from the server.', 502);
  return parsed.data;
}

/** For endpoints that answer 204 No Content (e.g. DELETE /users/me). */
export async function apiVoid(
  path: string,
  init: { method?: string; json?: unknown } = {},
): Promise<void> {
  await rawRequest(`/api/proxy/${path.replace(/^\/+/, '')}`, init);
}

export async function authRequest<S extends z.ZodType>(
  action: string,
  schema: S,
  json?: unknown,
): Promise<z.output<S>> {
  const res = await rawRequest(`/api/auth/${action}`, { method: 'POST', json: json ?? {} });
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success)
    throw new ApiError('BAD_RESPONSE', 'Unexpected response from the server.', 502);
  return parsed.data;
}

async function rawRequest(
  url: string,
  init: { method?: string; json?: unknown; body?: BodyInit; signal?: AbortSignal },
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      signal: init.signal,
      credentials: 'same-origin',
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(
      'NETWORK_ERROR',
      'Could not reach the server. Please check your connection and try again.',
      0,
    );
  }
  if (res.ok) return res;
  const err = await parseApiError(res);
  if (err.code === 'SESSION_EXPIRED' && typeof window !== 'undefined') {
    window.location.assign('/sign-in?reason=expired');
  }
  throw err;
}
