/**
 * Port of faikNew/src/constants/verdicts.ts — copy and logic are identical on purpose.
 * A score only means something relative to ITS OWN threshold, so everything keys off (score - threshold).
 */
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { Colors } from '@/styles/tokens';
import type { DetectionKind } from '@/lib/api/schemas';

export type VerdictLevel = 'clear' | 'close_clear' | 'close_flagged' | 'flagged';
export const CLOSE_CALL_MARGIN = 0.1;

export function verdictLevelFor(score: number, threshold: number): VerdictLevel {
  const margin = score - threshold;
  if (margin >= CLOSE_CALL_MARGIN) return 'flagged';
  if (margin >= 0) return 'close_flagged';
  if (margin > -CLOSE_CALL_MARGIN) return 'close_clear';
  return 'clear';
}

export type VerdictTone = 'clear' | 'caution' | 'flagged';
export const LEVEL_TONE: Record<VerdictLevel, VerdictTone> = {
  clear: 'clear',
  close_clear: 'caution',
  close_flagged: 'caution',
  flagged: 'flagged',
};
export const TONE_COLOR: Record<VerdictTone, string> = {
  clear: Colors.authentic,
  caution: Colors.tamper,
  flagged: Colors.aiRed,
};
/** Text-safe tone colors (AA on white). The light mobile tones are for fills/rings, not small text. */
export const TONE_TEXT_COLOR: Record<VerdictTone, string> = {
  clear: Colors.authenticDark,
  caution: '#8A5300',
  flagged: '#B52E4A',
};
export const LEVEL_ICON: Record<VerdictLevel, LucideIcon> = {
  clear: CheckCircle2,
  close_clear: HelpCircle,
  close_flagged: AlertTriangle,
  flagged: AlertOctagon,
};

interface VerdictCopy {
  title: string;
  subtitle: string;
  chip: string;
}

export const VERDICT_COPY: Record<DetectionKind, Record<VerdictLevel, VerdictCopy>> = {
  ai_audio: {
    clear: {
      title: 'No signs of an AI voice found',
      subtitle: 'We checked the voice and found nothing suspicious.',
      chip: 'No AI found',
    },
    close_clear: {
      title: 'Probably a real voice, but it’s a close call',
      subtitle: 'The voice looks mostly natural, but a few moments were borderline.',
      chip: 'Probably real',
    },
    close_flagged: {
      title: 'Possibly an AI voice, so be careful',
      subtitle: 'We found some signs of an AI-made voice, but it isn’t clear-cut.',
      chip: 'Possibly AI',
    },
    flagged: {
      title: 'Likely an AI-generated voice',
      subtitle: 'We found strong signs this voice was created or cloned by AI.',
      chip: 'Likely AI',
    },
  },
  ai_video: {
    clear: {
      title: 'No signs of AI-generated video found',
      subtitle: 'We checked the video and found nothing suspicious.',
      chip: 'No AI found',
    },
    close_clear: {
      title: 'Probably real video, but it’s a close call',
      subtitle: 'The video looks mostly natural, but a few moments were borderline.',
      chip: 'Probably real',
    },
    close_flagged: {
      title: 'Possibly AI-generated, so be careful',
      subtitle: 'We found some signs of AI generation in the video, but it isn’t clear-cut.',
      chip: 'Possibly AI',
    },
    flagged: {
      title: 'Likely AI-generated video',
      subtitle: 'We found strong signs this video was created by AI.',
      chip: 'Likely AI',
    },
  },
  lipsync: {
    clear: {
      title: 'No lip-sync problems found',
      subtitle: 'The speech and the lip movements line up, with no signs of editing.',
      chip: 'In sync',
    },
    close_clear: {
      title: 'Probably in sync, but it’s a close call',
      subtitle: 'The lips mostly match the speech, with a few borderline moments.',
      chip: 'Probably in sync',
    },
    close_flagged: {
      title: 'Possible lip-sync problem, so be careful',
      subtitle: 'Some parts don’t line up, which can mean editing or dubbing. It isn’t clear-cut.',
      chip: 'Possible mismatch',
    },
    flagged: {
      title: 'Lip movements don’t match the speech',
      subtitle: 'We found clear mismatches, which can mean the video was edited or dubbed.',
      chip: 'Mismatch',
    },
  },
};

export const CHECK_DESCRIPTION: Record<DetectionKind, string> = {
  ai_audio: 'Is the voice real, or made by AI?',
  ai_video: 'Was the video made by AI?',
  lipsync: 'Do the lips match what’s being said?',
};
