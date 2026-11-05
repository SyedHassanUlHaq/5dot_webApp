import { describe, expect, it } from 'vitest';
import type { ScanResponse } from '@/lib/api/schemas';
import { formatDuration, safeDecodeFilename, timeAgo } from './format';
import { chunkScoresFor, isScanDone, summarizeScan } from './summary';
import { validateFile, validateUrl } from './validate';
import { marginOf, verdictLevelFor } from './verdicts';

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

describe('verdictLevelFor at exactly ±10 points (float-noise regression)', () => {
  // Every threshold from 0.00 to 1.00 in 0.01 steps: a score exactly 10 points above must be flagged,
  // exactly 10 below must be clear, equal must be close_flagged, and the 9-point neighbours stay "close".
  const r = (x: number) => Math.round(x * 100) / 100;
  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
  it('exactly +10 points is flagged (was close_flagged for e.g. 0.6 vs 0.5)', () => {
    for (const t of thresholds)
      if (r(t + 0.1) <= 1) expect(verdictLevelFor(r(t + 0.1), t), `t=${t}`).toBe('flagged');
  });
  it('exactly -10 points is clear (was close_clear for e.g. 0.6 vs 0.7)', () => {
    for (const t of thresholds)
      if (r(t - 0.1) >= 0) expect(verdictLevelFor(r(t - 0.1), t), `t=${t}`).toBe('clear');
  });
  it('equal is close_flagged; 9 points either side stays a close call', () => {
    for (const t of thresholds) {
      expect(verdictLevelFor(t, t), `t=${t}`).toBe('close_flagged');
      if (r(t + 0.09) <= 1) expect(verdictLevelFor(r(t + 0.09), t), `t=${t}`).toBe('close_flagged');
      if (r(t - 0.09) >= 0) expect(verdictLevelFor(r(t - 0.09), t), `t=${t}`).toBe('close_clear');
    }
  });
  it('marginOf removes float noise but keeps real differences', () => {
    expect(marginOf(0.6, 0.5)).toBe(0.1);
    expect(marginOf(0.6, 0.7)).toBe(-0.1);
    expect(marginOf(0.5, 0.5)).toBe(0);
    expect(marginOf(0.123456, 0.1)).toBeCloseTo(0.023456, 9);
  });
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
  it('a score exactly 10 points over its threshold reads as flagged in the summary too', () => {
    const s = summarizeScan({
      ...base,
      resultData: {
        ai_video: { score: 0.6, threshold: 0.5 },
        lipsync: { score: 0.6, threshold: 0.7 },
      },
    });
    expect(s.detections.find((d) => d.kind === 'ai_video')?.level).toBe('flagged');
    expect(s.detections.find((d) => d.kind === 'lipsync')?.level).toBe('clear');
    expect(s.headline?.kind).toBe('ai_video');
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

describe('ScanHistorySchema with failed detections', () => {
  it('accepts resultData entries that carry an error instead of a score', async () => {
    const { ScanHistorySchema } = await import('@/lib/api/schemas');
    const r = ScanHistorySchema.parse({
      total: 1,
      offset: 0,
      limit: 20,
      items: [
        {
          requestId: 'a',
          filename: 'IMG_7485.MOV',
          status: 'failed',
          progress: 100,
          detections: { ai_video: { requested: true, status: 'failed' } },
          resultData: { ai_video: { error: 'max_workers must be greater than 0' } },
          createdAt: '2026-09-08T13:53:30.918026+00:00',
          completedAt: '2026-09-08T13:53:31.480275+00:00',
        },
      ],
    });
    expect(r.items).toHaveLength(1);
    expect(summarizeScan(r.items[0]!).detections[0]?.scorePct).toBeNull();
  });
});

describe('ScanCreatedSchema (POST /scans response)', () => {
  it('accepts the minimal queued response', async () => {
    const { ScanCreatedSchema } = await import('@/lib/api/schemas');
    const r = ScanCreatedSchema.parse({
      requestId: '4dd5f983-c24b-418f-ab52-ddc864046c3a',
      status: 'processing',
      createdAt: '2026-11-05T02:07:16.955434+00:00',
    });
    expect(r.status).toBe('processing');
    expect(r.filename).toBe('');
    expect(r.detections).toEqual({});
  });
});
