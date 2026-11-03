import 'server-only';

/** Backend base URL, e.g. https://api.axioware.tech/v1 (never hardcoded). */
export function apiBase(): string {
  const v = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!v) throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  return v.replace(/\/+$/, '');
}
