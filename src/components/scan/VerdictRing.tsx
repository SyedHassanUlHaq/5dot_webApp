import { Loader2, type LucideIcon } from 'lucide-react';
import { Colors } from '@/styles/tokens';

const ANALYZING_ORBS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'];

/** Port of mobile VerdictRing: glow circles + colored blobs behind a 220px ringed circle. Colors carry alpha as hex suffixes, like mobile. */
export function VerdictRing({
  color,
  Icon,
  label,
  scorePct,
  analyzing,
  textColor,
}: {
  color: string;
  Icon?: LucideIcon;
  label: string;
  scorePct?: number | null;
  analyzing?: boolean;
  /** AA-safe text color for the label/score (the ring itself uses `color`). */
  textColor?: string;
}) {
  const orbs = analyzing ? ANALYZING_ORBS : [color, color, color, color];
  const ring = analyzing ? Colors.brand : color;
  const txt = analyzing ? Colors.brand : (textColor ?? color);
  return (
    <div
      className="relative mx-auto flex size-[300px] items-center justify-center"
      role="img"
      aria-label={scorePct != null ? `${label}, score ${scorePct}%` : label}
    >
      <div
        aria-hidden
        className="absolute size-[300px] rounded-full"
        style={{ background: `${orbs[0]}20` }}
      />
      <div
        aria-hidden
        className="absolute size-[260px] rounded-full"
        style={{ background: `${orbs[1]}30` }}
      />
      <div
        aria-hidden
        className="absolute left-[30px] top-[10px] size-[140px] rounded-full"
        style={{ background: `${orbs[0]}60` }}
      />
      <div
        aria-hidden
        className="absolute bottom-[10px] right-[25px] size-[120px] rounded-full"
        style={{ background: `${orbs[1]}50` }}
      />
      <div
        aria-hidden
        className="absolute bottom-[40px] left-[20px] size-[100px] rounded-full"
        style={{ background: `${orbs[2]}40` }}
      />
      <div
        aria-hidden
        className="absolute right-[40px] top-[30px] size-[80px] rounded-full"
        style={{ background: `${orbs[3]}40` }}
      />
      <div
        className="relative flex size-[220px] items-center justify-center rounded-full border-4 bg-white/95"
        style={{ borderColor: ring, boxShadow: `0 0 24px ${ring}55` }}
      >
        <div className="flex flex-col items-center gap-1 px-4 text-center">
          {analyzing ? (
            <Loader2
              className="size-10 animate-spin text-brand motion-reduce:animate-none"
              aria-hidden
            />
          ) : Icon ? (
            <Icon className="size-16" style={{ color: ring }} aria-hidden />
          ) : null}
          <span className="text-h3 font-bold leading-tight" style={{ color: txt }}>
            {label}
          </span>
          {scorePct != null ? (
            <span className="text-h2 font-extrabold" style={{ color: txt }}>
              {scorePct}%
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
