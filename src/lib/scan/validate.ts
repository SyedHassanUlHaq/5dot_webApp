import { DETECTION_META, type DetectionKind } from './meta';
import { formatBytes } from './format';

/** Mirrors mobile ScanUploadScreen: "up to 125 MB · 5 min". Duration is enforced by the backend. */
export const MAX_FILE_BYTES = 125 * 1024 * 1024;
export const MAX_MINUTES = 5;

export function allowedExtensions(kinds: DetectionKind[]): string[] {
  return Array.from(new Set(kinds.flatMap((k) => DETECTION_META[k].extensions)));
}

export function formatInfoForSelection(kinds: DetectionKind[]): string {
  return `${allowedExtensions(kinds).join(', ')} / up to 125 MB · ${MAX_MINUTES} min`;
}

export function validateFile(
  file: { name: string; size: number },
  kinds: DetectionKind[],
): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowed = allowedExtensions(kinds);
  if (!allowed.includes(ext)) return `Unsupported file type. Use ${allowed.join(', ')}.`;
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_BYTES)
    return `This file is ${formatBytes(file.size)}. The limit is 125 MB.`;
  return null;
}

/** Best-effort URL check; the backend decides which sources it can actually fetch (mobile hint: YouTube, TikTok, IG, FB, X). */
export function validateUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:'
      ? null
      : 'Enter a link starting with https://';
  } catch {
    return 'Enter a valid link, e.g. https://www.youtube.com/watch?v=…';
  }
}
