// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { legalHtmlResponse } from './legal';

// The only edits allowed are internal-link rewrites. Undo them and the result must equal the source byte-for-byte.
const ROUTE_TO_FILE: [string, string][] = [
  ['href="/privacy"', 'href="/privacy-policy.html"'],
  ['href="/delete-account"', 'href="/delete-account.html"'],
  ['href="/support"', 'href="/support.html"'],
];
const normalizeSourceLinks = (s: string) =>
  s.replace(/href="privacy-policy\.html"/g, 'href="/privacy-policy.html"');

describe('legalHtmlResponse', () => {
  it.each(['privacy-policy.html', 'delete-account.html', 'support.html'])(
    '%s: only internal links change',
    async (file) => {
      const original = readFileSync(`content/legal/${file}`, 'utf8');
      const res = legalHtmlResponse(file);
      expect(res.headers.get('content-type')).toContain('text/html');
      let html = await res.text();
      expect(html).not.toMatch(/href="\/?(privacy-policy|support|delete-account)\.html"/);
      for (const [route, fileHref] of ROUTE_TO_FILE) html = html.replaceAll(route, fileHref);
      expect(html).toBe(normalizeSourceLinks(original));
    },
  );
  it('rewrites the delete-account page link back to the app route', async () => {
    expect(await legalHtmlResponse('delete-account.html').text()).toContain('href="/privacy"');
  });
});
