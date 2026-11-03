/** Port of faikNew/src/constants/detectionKinds.ts (icons are lucide equivalents of Feather). */
import { Mic, UserCheck, Video, type LucideIcon } from 'lucide-react';
import { Colors } from '@/styles/tokens';
import type { DetectionKind } from '@/lib/api/schemas';

export type { DetectionKind };
export const DETECTION_KINDS: DetectionKind[] = ['ai_audio', 'ai_video', 'lipsync'];

export const DETECTION_META: Record<
  DetectionKind,
  {
    label: string;
    shortLabel: string;
    icon: LucideIcon;
    color: string;
    extensions: string[];
    accept: string;
    formField: string;
  }
> = {
  ai_audio: {
    label: 'AI Voice Detection',
    shortLabel: 'Audio',
    icon: Mic,
    color: Colors.audioPink,
    extensions: ['wav', 'mp3', 'm4a', 'opus'],
    accept: 'audio/*',
    formField: 'detectAiAudio',
  },
  ai_video: {
    label: 'AI Video Detection',
    shortLabel: 'Video',
    icon: Video,
    color: Colors.videoPurple,
    extensions: ['mp4', 'mov'],
    accept: 'video/*',
    formField: 'detectAiVideo',
  },
  lipsync: {
    label: 'Lip-Sync Detection',
    shortLabel: 'Lip-sync',
    icon: UserCheck,
    color: Colors.tamper, // not brand: too close to audioPink on the timeline (same reasoning as mobile)
    extensions: ['mp4', 'mov'],
    accept: 'video/*',
    formField: 'detectLipsync',
  },
};
