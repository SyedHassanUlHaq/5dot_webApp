import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest, apiVoid } from './client';
import { ApiError } from './errors';

afterEach(() => vi.unstubAllGlobals());
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

describe('api client', () => {
  it('validates responses with the schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ a: 'not-a-number' })));
    await expect(apiRequest('x', z.object({ a: z.number() }))).rejects.toMatchObject({
      code: 'BAD_RESPONSE',
    });
  });
  it('maps network failure to a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fail')));
    await expect(apiRequest('x', z.unknown())).rejects.toBeInstanceOf(ApiError);
  });
  it('redirects to /sign-in?reason=expired on SESSION_EXPIRED', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ error: { code: 'SESSION_EXPIRED', message: 'm', statusCode: 401 } }, 401),
        ),
    );
    await expect(apiRequest('users/me', z.unknown())).rejects.toMatchObject({ statusCode: 401 });
    expect(assign).toHaveBeenCalledWith('/sign-in?reason=expired');
  });
  it('apiVoid accepts 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiVoid('users/me', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
