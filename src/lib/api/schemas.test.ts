import { describe, expect, it } from 'vitest';
import { ScanHistorySchema, ScanResponseSchema } from './schemas';

// Shape copied from a real GET /scans/history response: successful scans have NO errorMessage field.
const real = {
  total: 11,
  offset: 0,
  limit: 4,
  items: [
    {
      requestId: '3aa670a4-72ac-4e28-aa22-44f9f25ab3af',
      filename: 'VID-20261004-WA0006.mp4',
      status: 'complete',
      progress: 100,
      detections: { ai_video: { requested: true, status: 'complete' } },
      resultData: { ai_video: { score: 0.9348592758178711, threshold: 0.5 } },
      createdAt: '2026-10-04T14:43:46.689797+00:00',
      completedAt: '2026-10-04T14:43:53.877400+00:00',
    },
  ],
};

describe('scan schemas against real backend payloads', () => {
  it('accepts a history item with no errorMessage field and normalizes it to null', () => {
    const parsed = ScanHistorySchema.parse(real);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.errorMessage).toBeNull();
  });

  it('derives hasMore when the backend omits it', () => {
    expect(ScanHistorySchema.parse(real).hasMore).toBe(true); // 1 of 11 loaded
    expect(ScanHistorySchema.parse({ ...real, total: 1 }).hasMore).toBe(false);
    expect(ScanHistorySchema.parse({ ...real, hasMore: false }).hasMore).toBe(false);
  });

  it('keeps a real error message and accepts explicit null', () => {
    const base = real.items[0]!;
    expect(ScanResponseSchema.parse({ ...base, errorMessage: 'boom' }).errorMessage).toBe('boom');
    expect(ScanResponseSchema.parse({ ...base, errorMessage: null }).errorMessage).toBeNull();
  });
});
