import { describe, expect, it } from 'vitest';
import type { ScanResponse } from '@/lib/api/schemas';
import { formatDuration, safeDecodeFilename, timeAgo } from './format';
import { chunkScoresFor, isScanDone, summarizeScan } from './summary';
import { validateFile, validateUrl } from './validate';
import { verdictLevelFor } from './verdicts';

const base: ScanResponse = {
  requestId: 'r1',
  filename: 'a.mp4',
  status: 'processing',
  progress: 10,
  detections: {
    ai_video: { requested: true, status: 'complete' },
    lipsync: { requested: true, status: 'complete' },
  },
  resultData: null,
  errorMessage: null,
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: null,
};

describe('verdictLevelFor (relative to own threshold)', () => {
  it.each([
    [0.9, 0.5, 'flagged'],
    [0.65, 0.5, 'flagged'],
    [0.55, 0.5, 'close_flagged'],
    [0.5, 0.5, 'close_flagged'],
    [0.45, 0.5, 'close_clear'],
    [0.2, 0.5, 'clear'],
    [0.75, 0.8, 'close_clear'], // high raw score but under its own (higher) threshold
  ])('score %s thr %s → %s', (s, t, level) => expect(verdictLevelFor(s, t)).toBe(level));
});

describe('summarizeScan', () => {
  it('headline is the check furthest past its own threshold, not highest raw score', () => {
    const s = summarizeScan({
      ...base,
      resultData: {
        ai_video: { score: 0.7, threshold: 0.9 },
        lipsync: { score: 0.55, threshold: 0.3 },
      },
    });
    expect(s.headline?.kind).toBe('lipsync');
    expect(s.anyFlagged).toBe(true);
    expect(s.detections.find((d) => d.kind === 'ai_video')?.level).toBe('clear');
  });
  it('defaults a missing threshold to 0.5', () => {
    const s = summarizeScan({ ...base, resultData: { ai_video: { score: 0.8 } as never } });
    expect(s.detections[0]?.flagged).toBe(true);
    expect(s.detections[0]?.thresholdPct).toBe(50);
  });
  it('only lists requested detections and has no headline before results', () => {
    const s = summarizeScan({
      ...base,
      detections: {
        ai_audio: { requested: false, status: 'pending' },
        ai_video: { requested: true, status: 'processing' },
      },
    });
    expect(s.detections.map((d) => d.kind)).toEqual(['ai_video']);
    expect(s.headline).toBeNull();
    expect(s.allSettled).toBe(false);
  });
});

describe('isScanDone', () => {
  it('is done when all detections settle even if top-level status lags', () =>
    expect(isScanDone(base)).toBe(true));
  it('is not done while a detection is processing', () =>
    expect(
      isScanDone({ ...base, detections: { ai_video: { requested: true, status: 'processing' } } }),
    ).toBe(false));
  it('is done on failure', () =>
    expect(
      isScanDone({
        ...base,
        status: 'failed',
        detections: { ai_video: { requested: true, status: 'processing' } },
      }),
    ).toBe(true));
});

describe('chunkScoresFor', () => {
  it('skips chunks without a score for the kind', () => {
    const chunks = [
      {
        chunkIndex: 0,
        segmentStart: 0,
        segmentEnd: 5,
        aiAudioScore: 0.2,
        aiVideoScore: null,
        lipsyncScore: null,
      },
      {
        chunkIndex: 1,
        segmentStart: 5,
        segmentEnd: 10,
        aiAudioScore: null,
        aiVideoScore: 0.9,
        lipsyncScore: null,
      },
    ];
    expect(chunkScoresFor(chunks, 'ai_audio')).toEqual([{ start: 0, end: 5, score: 0.2 }]);
    expect(chunkScoresFor(chunks, 'ai_video')).toEqual([{ start: 5, end: 10, score: 0.9 }]);
  });
});

describe('format + validate', () => {
  it('decodes filenames safely', () => {
    expect(safeDecodeFilename('My%20File.mp4')).toBe('My File.mp4');
    expect(safeDecodeFilename('100% Done.mp4')).toBe('100% Done.mp4');
  });
  it('formats durations and relative time', () => {
    expect(formatDuration(65)).toBe('1:05');
    const now = Date.parse('2026-01-10T00:00:00Z');
    expect(timeAgo('2026-01-09T23:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-01-09T22:00:00Z', now)).toBe('2 hr ago');
    expect(timeAgo('2026-01-08T00:00:00Z', now)).toBe('2 days ago');
    expect(timeAgo(null)).toBe('N/A');
  });
  it('validates files by kind, type and size', () => {
    expect(validateFile({ name: 'a.mp3', size: 1000 }, ['ai_audio'])).toBeNull();
    expect(validateFile({ name: 'a.mp3', size: 1000 }, ['ai_video'])).toMatch(/Unsupported/);
    expect(validateFile({ name: 'a.MP4', size: 1000 }, ['ai_video'])).toBeNull();
    expect(validateFile({ name: 'a.mp4', size: 126 * 1024 * 1024 }, ['ai_video'])).toMatch(
      /125 MB/,
    );
    expect(validateFile({ name: 'a.mp4', size: 0 }, ['ai_video'])).toMatch(/empty/);
  });
  it('validates urls', () => {
    expect(validateUrl('https://youtu.be/x')).toBeNull();
    expect(validateUrl('javascript:alert(1)')).not.toBeNull();
    expect(validateUrl('not a url')).not.toBeNull();
  });
});
