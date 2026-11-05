import { z } from 'zod';
import { ApiError, parseApiError } from '@/lib/api/errors';
import { apiRequest, authRequest } from '@/lib/api/client';
import { ScanCreatedSchema, type DetectionKind, type ScanResponse } from '@/lib/api/schemas';
import { DETECTION_KINDS, DETECTION_META } from './meta';

function buildForm(kinds: DetectionKind[], extra: { file?: File; url?: string }): FormData {
  const form = new FormData();
  if (extra.file) form.append('file', extra.file, extra.file.name);
  if (extra.url) form.append('url', extra.url);
  for (const k of DETECTION_KINDS)
    form.append(DETECTION_META[k].formField, String(kinds.includes(k)));
  // Tamper/scene detection isn't exposed (see detectionKinds.ts), but the backend's form always expects it.
  form.append('detectChanges', 'false');
  return form;
}

/** URL scans are tiny → through the BFF proxy. */
export function submitScanUrl(url: string, kinds: DetectionKind[]): Promise<ScanResponse> {
  return apiRequest('scans', ScanCreatedSchema, {
    method: 'POST',
    body: buildForm(kinds, { url }),
  });
}

export interface UploadHandle {
  promise: Promise<ScanResponse>;
  abort: () => void;
}

/**
 * File scans: XHR (for upload progress). By default goes straight to the backend with the access token from
 * /api/auth/upload-token, because serverless hosts can't proxy 125 MB. Set NEXT_PUBLIC_UPLOAD_MODE=proxy on a
 * self-hosted Node server to stream through the BFF instead (browser never sees a token).
 */
export function uploadScanFile(
  file: File,
  kinds: DetectionKind[],
  onProgress: (pct: number) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();
  let aborted = false;

  const promise = (async () => {
    const proxy = process.env.NEXT_PUBLIC_UPLOAD_MODE === 'proxy';
    let url = '/api/proxy/scans';
    let bearer: string | null = null;
    if (!proxy) {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) throw new ApiError('CONFIG', 'App is not configured (missing API URL).', 500);
      url = `${base.replace(/\/+$/, '')}/scans`;
      bearer = (await authRequest('upload-token', z.object({ accessToken: z.string() })))
        .accessToken;
    }
    if (aborted) throw new DOMException('Aborted', 'AbortError');

    return new Promise<ScanResponse>((resolve, reject) => {
      xhr.open('POST', url);
      if (bearer) xhr.setRequestHeader('Authorization', `Bearer ${bearer}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () =>
        reject(
          new ApiError(
            'NETWORK_ERROR',
            'Could not reach the server. Please check your connection and try again.',
            0,
          ),
        );
      xhr.ontimeout = xhr.onerror;
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
      xhr.onload = async () => {
        const res = new Response(xhr.responseText, { status: xhr.status });
        if (xhr.status >= 200 && xhr.status < 300) {
          const parsed = ScanCreatedSchema.safeParse(JSON.parse(xhr.responseText || 'null'));
          return parsed.success
            ? resolve(parsed.data)
            : reject(new ApiError('BAD_RESPONSE', 'Unexpected response from the server.', 502));
        }
        if (xhr.status === 401 && proxy && typeof window !== 'undefined')
          window.location.assign('/sign-in?reason=expired');
        reject(await parseApiError(res)); // handles {error}, {detail} and the 413/502/503/504 HTML pages
      };
      xhr.send(buildForm(kinds, { file }));
    });
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      xhr.abort();
    },
  };
}

/** Fetches the forensic PDF through the proxy and saves it via a temporary link. */
export async function downloadReportPdf(requestId: string, filename: string): Promise<void> {
  const res = await fetch(`/api/proxy/scans/${encodeURIComponent(requestId)}/report.pdf`, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = await parseApiError(res);
    if (err.code === 'SESSION_EXPIRED') window.location.assign('/sign-in?reason=expired');
    throw err;
  }
  const blob = await res.blob();
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, '_') || 'scan';
  const a = document.createElement('a');
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = `${safe}_report.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
