/** Port of faikNew/src/utils/scanSummary.ts. */
import type { DetectionKind, ScanResponse } from '@/lib/api/schemas';
import { DETECTION_KINDS } from './meta';
import { marginOf, verdictLevelFor, type VerdictLevel } from './verdicts';

type Chunk = NonNullable<ScanResponse['chunks']>[number];
const CHUNK_FIELD: Record<DetectionKind, 'aiAudioScore' | 'aiVideoScore' | 'lipsyncScore'> = {
  ai_audio: 'aiAudioScore',
  ai_video: 'aiVideoScore',
  lipsync: 'lipsyncScore',
};

export function chunkScoresFor(chunks: Chunk[], kind: DetectionKind) {
  const field = CHUNK_FIELD[kind];
  return chunks
    .filter((c) => c[field] !== null)
    .map((c) => ({ start: c.segmentStart, end: c.segmentEnd, score: c[field] as number }));
}

export interface DetectionSummary {
  kind: DetectionKind;
  state: ScanResponse['detections'][DetectionKind];
  result: { score: number; threshold: number } | undefined;
  scorePct: number | null;
  thresholdPct: number | null;
  flagged: boolean | null;
  level: VerdictLevel | null;
  margin: number | null;
}

export interface ScanSummary {
  requestId: string;
  filename: string;
  status: ScanResponse['status'];
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  detections: DetectionSummary[];
  headline: DetectionSummary | null;
  /** Every requested detection is terminal. The top-level status can lag behind on the real backend. */
  allSettled: boolean;
  anyFlagged: boolean;
}

export function summarizeScan(
  scan: Omit<ScanResponse, 'progress' | 'chunks'> &
    Partial<Pick<ScanResponse, 'progress' | 'chunks'>>,
): ScanSummary {
  const detections: DetectionSummary[] = DETECTION_KINDS.filter(
    (k) => scan.detections[k]?.requested,
  ).map((kind) => {
    const state = scan.detections[kind];
    const result = scan.resultData?.[kind] ?? undefined;
    // Older rows can lack a threshold; `score >= undefined` is always false, so default like the backend (0.5).
    const threshold = result?.threshold ?? 0.5;
    return {
      kind,
      state,
      result,
      scorePct: result ? Math.round(result.score * 100) : null,
      thresholdPct: result ? Math.round(threshold * 100) : null,
      flagged: result ? result.score >= threshold : null,
      level: result ? verdictLevelFor(result.score, threshold) : null,
      margin: result ? marginOf(result.score, threshold) : null,
    };
  });

  // Headline = furthest past (or closest to) its OWN threshold, not the highest raw score.
  const withResult = detections.filter(
    (d): d is DetectionSummary & { margin: number } => d.margin !== null,
  );
  const headline = withResult.length
    ? withResult.reduce((best, d) => (d.margin > best.margin ? d : best))
    : null;

  return {
    requestId: scan.requestId,
    filename: scan.filename,
    status: scan.status,
    createdAt: scan.createdAt,
    completedAt: scan.completedAt,
    errorMessage: scan.errorMessage ?? null,
    detections,
    headline,
    allSettled:
      detections.length > 0 &&
      detections.every((d) => d.state?.status === 'complete' || d.state?.status === 'failed'),
    anyFlagged: detections.some((d) => d.flagged === true),
  };
}

/** Polling is over once the scan failed, completed, or every requested detection settled. */
export function isScanDone(scan: ScanResponse): boolean {
  return scan.status === 'failed' || scan.status === 'complete' || summarizeScan(scan).allSettled;
}
