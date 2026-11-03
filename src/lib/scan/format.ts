export function safeDecodeFilename(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name; // e.g. "100% Done.mp4" is not a valid escape sequence
  }
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function timeAgo(isoDate: string | null, now = Date.now()): string {
  if (!isoDate) return 'N/A';
  const sec = Math.floor((now - new Date(isoDate).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const wk = Math.floor(day / 7);
  return `${wk} week${wk === 1 ? '' : 's'} ago`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
