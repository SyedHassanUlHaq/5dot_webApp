import { describe, expect, it } from 'vitest';
import { parseApiError } from './errors';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('parseApiError', () => {
  it('reads the custom envelope', async () => {
    const e = await parseApiError(
      json({ error: { code: 'SCAN_LIMIT_REACHED', message: 'Quota', statusCode: 429 } }, 429),
    );
    expect([e.code, e.message, e.statusCode]).toEqual(['SCAN_LIMIT_REACHED', 'Quota', 429]);
  });
  it('reads FastAPI string detail', async () => {
    const e = await parseApiError(json({ detail: 'Not authenticated' }, 401));
    expect(e.message).toBe('Not authenticated');
    expect(e.code).toBe('UNKNOWN');
  });
  it('joins FastAPI validation errors', async () => {
    const e = await parseApiError(json({ detail: [{ msg: 'a' }, { msg: 'b' }, {}] }, 422));
    expect(e.message).toBe('a b');
  });
  it.each([
    [413, 'too large'],
    [502, 'temporarily unavailable'],
    [503, 'temporarily unavailable'],
    [504, 'temporarily unavailable'],
    [500, 'Something went wrong'],
  ])('falls back for HTML %i', async (status, text) => {
    const e = await parseApiError(new Response('<html>nginx</html>', { status }));
    expect(e.message).toContain(text);
  });
});
