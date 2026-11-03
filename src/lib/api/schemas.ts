/** Zod schemas for backend responses. Shapes come from faikNew/src/services/*.ts (not BACKEND_SPEC.md). */
import { z } from 'zod';

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
  filename: z.string(),
  status: z.enum(['processing', 'complete', 'failed']),
  progress: z.number(),
  detections: z.partialRecord(DetectionKind, DetectionState),
  resultData: z.partialRecord(DetectionKind, DetectionResult).nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  chunks: z.array(ScanChunkSchema).optional(),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

export const ScanHistorySchema = z.object({
  items: z.array(ScanResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});
export type ScanHistory = z.infer<typeof ScanHistorySchema>;

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
