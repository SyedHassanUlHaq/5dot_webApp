import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Serves first-party legal HTML (copied verbatim from faikNew/legal/) as standalone documents, so the text
 * is exactly what was written. Only internal links are rewritten to this app's routes.
 */
const LINKS: [RegExp, string][] = [
  [/href="\/?privacy-policy\.html"/g, 'href="/privacy"'],
  [/href="\/?delete-account\.html"/g, 'href="/delete-account"'],
  [/href="\/?support\.html"/g, 'href="/support"'],
];

export function legalHtmlResponse(file: string): Response {
  let html = readFileSync(path.join(process.cwd(), 'content', 'legal', file), 'utf8');
  for (const [re, to] of LINKS) html = html.replace(re, to);
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
