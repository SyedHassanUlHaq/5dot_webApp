/** Zod schemas for backend responses. Shapes come from faikNew/src/services/*.ts (not BACKEND_SPEC.md). */
import '@/lib/zod-config';
import { z } from 'zod';
import { safeDecodeFilename } from '@/lib/scan/format';

export const PlanId = z.enum(['free', 'pro', 'team']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  avatarInitials: z.string(),
  avatarColor: z.string(),
  plan: PlanId,
  modelVersion: z.string(),
  scansUsedThisMonth: z.number(),
  scansLimitThisMonth: z.number().nullable(),
  planResetDate: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const TokensSchema = z.object({ accessToken: z.string(), refreshToken: z.string() });
export type Tokens = z.infer<typeof TokensSchema>;

export const AuthResponseSchema = TokensSchema.extend({ user: UserSchema });
export const MessageSchema = z.object({ message: z.string() });

export const DetectionKind = z.enum(['ai_audio', 'ai_video', 'lipsync']);
export type DetectionKind = z.infer<typeof DetectionKind>;

const DetectionState = z.object({
  requested: z.boolean(),
  status: z.enum(['pending', 'processing', 'complete', 'failed']),
});
const DetectionResult = z.object({ score: z.number(), threshold: z.number() });

export const ScanChunkSchema = z.object({
  chunkIndex: z.number(),
  segmentStart: z.number(),
  segmentEnd: z.number(),
  aiAudioScore: z.number().nullable(),
  aiVideoScore: z.number().nullable(),
  lipsyncScore: z.number().nullable(),
  changesPoints: z.unknown().optional(),
});

export const ScanResponseSchema = z.object({
  requestId: z.string(),
  // Single choke point: every scan has a clean, human-readable filename (same as mobile decodeResponse).
  filename: z.string().transform(safeDecodeFilename),
  status: z.enum(['processing', 'complete', 'failed']),
  progress: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  detections: z
    .partialRecord(DetectionKind, DetectionState)
    .nullish()
    .transform((v) => v ?? {}),
  // Failed/in-flight scans may omit these instead of sending null.
  resultData: z
    .partialRecord(DetectionKind, DetectionResult)
    .nullish()
    .transform((v) => v ?? null),
  // The backend omits this field for successful scans, so accept missing as well as null.
  errorMessage: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  createdAt: z.string(),
  completedAt: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  chunks: z.array(ScanChunkSchema).optional(),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

const ScanHistoryEnvelope = z.object({
  items: z.array(ScanResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  // Real responses omit hasMore; derive it from the paging numbers when it is missing.
  hasMore: z.boolean().optional(),
});
export type ScanHistory = Omit<z.infer<typeof ScanHistoryEnvelope>, 'hasMore'> & {
  hasMore: boolean;
};
/** The endpoint's schema wasn't published when mobile shipped; mobile tolerates a bare array, so do we. */
export const ScanHistorySchema = z
  .union([ScanHistoryEnvelope, z.array(ScanResponseSchema)])
  .transform((d): ScanHistory =>
    Array.isArray(d)
      ? { items: d, total: d.length, limit: d.length, offset: 0, hasMore: false }
      : { ...d, hasMore: d.hasMore ?? d.offset + d.items.length < d.total },
  );

export const TrendingItemSchema = z.object({
  url: z.string(),
  scanCount: z.number().nullable(),
  score: z.number().nullable(),
  verdict: z.enum(['ai', 'authentic', 'tampered']).nullable(),
  youtube: z.object({
    title: z.string(),
    channelTitle: z.string(),
    thumbnailUrl: z.string(),
    viewCount: z.number().nullable(),
    likeCount: z.number().nullable(),
  }),
});
export const TrendingSchema = z.object({ items: z.array(TrendingItemSchema) });
export type TrendingItem = z.infer<typeof TrendingItemSchema>;

export const PlanSchema = z.object({
  id: PlanId,
  name: z.string(),
  price: z.number(),
  currency: z.string(),
  billingPeriod: z.string(),
  scansPerMonth: z.number().nullable(),
  features: z.array(z.string()),
  priorityQueue: z.boolean(),
  apiAccess: z.boolean(),
  trialDays: z.number().optional(),
  seats: z.number().optional(),
  apiCallsPerMonth: z.number().optional(),
});
export const PlansResponseSchema = z.object({ plans: z.array(PlanSchema) });

export const WeeklyStatsSchema = z.object({
  totalScans: z.number(),
  flaggedScans: z.number(),
  dailyBreakdown: z.array(z.object({ day: z.string(), scans: z.number() })),
});

export const NotificationSchema = z.object({
  id: z.string(),
  template: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof NotificationSchema>;
export const NotificationListSchema = z
  .object({
    items: z.array(NotificationSchema),
    total: z.number(),
    unread: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean().optional(),
  })
  .transform((d) => ({ ...d, hasMore: d.hasMore ?? d.page * d.limit < d.total }));

export const FeedbackResponseSchema = z.object({ feedbackId: z.string(), message: z.string() });
export type Plan = z.infer<typeof PlanSchema>;
