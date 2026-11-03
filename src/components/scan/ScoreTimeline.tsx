'use client';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '@/lib/scan/format';
import { Colors } from '@/styles/tokens';

export interface TimelineSeries {
  key: string;
  label: string;
  color: string;
  threshold: number; // 0-1
  points: { start: number; end: number; score: number }[]; // score 0-1
}

const H = 190;
const X0 = 42;
const Y0 = 14;
const Y1 = 150;
const MAX_X_LABELS = 6;
const THRESH = '#B45309';

/** Port of mobile ScoreTimeline. SVG is sized to the measured width so the scale stays 1:1. */
export function ScoreTimeline({ series }: { series: TimelineSeries[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => e && setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const withPoints = series.filter((s) => s.points.length > 0);
  if (withPoints.length === 0) return null;

  const x1 = w - 12;
  const maxEnd = Math.max(...withPoints.flatMap((s) => s.points.map((p) => p.end)), 1);
  const xFor = (t: number) => X0 + (t / maxEnd) * (x1 - X0);
  const yFor = (s: number) => Y1 - Math.max(0, Math.min(1, s)) * (Y1 - Y0);
  const widest = withPoints.reduce((a, b) => (b.points.length > a.points.length ? b : a));
  const every = Math.max(1, Math.ceil(widest.points.length / MAX_X_LABELS));
  const thresholds = [...new Set(withPoints.map((s) => s.threshold))];

  return (
    <section
      className="rounded-card bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
      aria-labelledby="timeline-title"
    >
      <h3
        id="timeline-title"
        className="text-label font-semibold uppercase tracking-[1.2px] text-ink-2"
      >
        Score over time
      </h3>
      <p className="mb-2 text-caption text-ink-3">Per-segment breakdown from the raw analysis</p>
      <div ref={wrap}>
        {w > 0 && (
          <svg
            width={w}
            height={H}
            viewBox={`0 0 ${w} ${H}`}
            role="img"
            aria-label={`Score over time for ${withPoints.map((s) => s.label).join(', ')}. Details in the table below.`}
          >
            {[0, 25, 50, 75, 100].map((p) => (
              <g key={p}>
                <line
                  x1={X0}
                  y1={yFor(p / 100)}
                  x2={x1}
                  y2={yFor(p / 100)}
                  stroke={Colors.border}
                />
                <text
                  x={X0 - 8}
                  y={yFor(p / 100) + 3}
                  fontSize={9}
                  fill={Colors.gray500}
                  textAnchor="end"
                >
                  {p}
                </text>
              </g>
            ))}
            {thresholds.map((t) => (
              <g key={`t${t}`}>
                <line
                  x1={X0}
                  y1={yFor(t)}
                  x2={x1}
                  y2={yFor(t)}
                  stroke={THRESH}
                  strokeWidth={1.2}
                  strokeDasharray="5,4"
                />
                <text
                  x={x1}
                  y={yFor(t) - 4}
                  fontSize={8.5}
                  fill={THRESH}
                  textAnchor="end"
                >{`Threshold ${Math.round(t * 100)}%`}</text>
              </g>
            ))}
            <line x1={X0} y1={Y1} x2={x1} y2={Y1} stroke={Colors.gray500} />
            {withPoints.map((s) => (
              <g key={s.key}>
                <polyline
                  points={s.points.map((p) => `${xFor(p.start)},${yFor(p.score)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {s.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={xFor(p.start)}
                    cy={yFor(p.score)}
                    r={3}
                    fill={p.score >= s.threshold ? s.color : Colors.surface}
                    stroke={s.color}
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            ))}
            {widest.points.map((p, i) =>
              i % every === 0 || i === widest.points.length - 1 ? (
                <text
                  key={i}
                  x={xFor(p.start)}
                  y={Y1 + 18}
                  fontSize={9}
                  fill={Colors.gray500}
                  textAnchor="middle"
                >
                  {formatDuration(p.start)}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </div>
      {withPoints.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-4">
          {withPoints.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-caption text-gray-700">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <table className="sr-only">
        <caption>Per-segment scores</caption>
        <thead>
          <tr>
            <th>Check</th>
            <th>From</th>
            <th>To</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {withPoints.flatMap((s) =>
            s.points.map((p, i) => (
              <tr key={`${s.key}${i}`}>
                <td>{s.label}</td>
                <td>{formatDuration(p.start)}</td>
                <td>{formatDuration(p.end)}</td>
                <td>{Math.round(p.score * 100)}%</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </section>
  );
}
