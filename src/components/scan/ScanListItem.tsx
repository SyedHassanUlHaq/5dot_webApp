import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ScanResponse } from '@/lib/api/schemas';
import { timeAgo } from '@/lib/scan/format';
import { DETECTION_META } from '@/lib/scan/meta';
import { summarizeScan } from '@/lib/scan/summary';
import {
  LEVEL_ICON,
  LEVEL_TONE,
  TONE_COLOR,
  TONE_TEXT_COLOR,
  VERDICT_COPY,
} from '@/lib/scan/verdicts';
import { Colors } from '@/styles/tokens';

/** Port of mobile ScanListItem: kind icon box + filename/time + verdict pill (colored by verdict, not by kind). */
export function ScanListItem({ scan }: { scan: ScanResponse }) {
  const { headline } = summarizeScan(scan);
  const meta = headline ? DETECTION_META[headline.kind] : null;
  const level = headline?.level ?? null;
  const tone = level ? LEVEL_TONE[level] : null;
  const label =
    headline && level
      ? VERDICT_COPY[headline.kind][level].chip
      : scan.status === 'failed'
        ? 'Failed'
        : 'Analyzing';
  const LevelIcon = level ? LEVEL_ICON[level] : null;
  const KindIcon = meta?.icon;
  const iconColor = meta?.color ?? Colors.textTertiary;

  return (
    <Link
      href={`/scan/${encodeURIComponent(scan.requestId)}`}
      className="flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-100"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-input"
        style={{ background: `${iconColor}20` }}
      >
        {KindIcon ? (
          <KindIcon className="size-5" style={{ color: iconColor }} aria-hidden />
        ) : scan.status === 'failed' ? (
          <AlertCircle className="size-5 text-ai" aria-hidden />
        ) : (
          <Loader2
            className="size-5 animate-spin text-ink-3 motion-reduce:animate-none"
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{scan.filename}</span>
        <span className="block text-caption text-ink-2">
          {timeAgo(scan.completedAt ?? scan.createdAt)}
        </span>
      </span>
      <span
        className="flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-caption font-bold"
        style={{
          background: tone ? `${TONE_COLOR[tone]}20` : Colors.gray100,
          color: tone ? TONE_TEXT_COLOR[tone] : Colors.textSecondary,
        }}
      >
        {LevelIcon ? <LevelIcon className="size-[11px]" aria-hidden /> : null}
        {label}
      </span>
    </Link>
  );
}
