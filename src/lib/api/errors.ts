/**
 * Port of faikNew/src/services/api.ts error handling.
 * Handles both `{error:{code,message,statusCode}}` and FastAPI `{detail: ...}`.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) =>
        d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : null,
      )
      .filter((m): m is string => !!m);
    if (msgs.length) return msgs.join(' ');
  }
  return null;
}

/** Used when a proxy in front of the API answers with an HTML page instead of JSON. */
export function fallbackMessageForStatus(status: number): string {
  if (status === 413) return 'This file is too large to upload. Try a smaller file.';
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }
  return 'Something went wrong.';
}

export async function parseApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error) {
      return new ApiError(
        body.error.code ?? 'UNKNOWN',
        body.error.message ?? fallbackMessageForStatus(res.status),
        res.status,
      );
    }
    const detail = messageFromDetail(body?.detail);
    if (detail) return new ApiError('UNKNOWN', detail, res.status);
    return new ApiError('UNKNOWN', fallbackMessageForStatus(res.status), res.status);
  } catch {
    return new ApiError('UNKNOWN', fallbackMessageForStatus(res.status), res.status);
  }
}

export function errorBody(e: ApiError) {
  return { error: { code: e.code, message: e.message, statusCode: e.statusCode } };
}
