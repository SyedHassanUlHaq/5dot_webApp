'use client';
import { Mic, Scissors, Upload, Video } from 'lucide-react';
import Link from 'next/link';
import { ScanListItem } from '@/components/scan/ScanListItem';
import { Card } from '@/components/ui/Card';
import { useMe } from '@/lib/auth/session';
import { useRecentScans, useTrending } from '@/lib/scan/hooks';
import { DETECTION_META, type DetectionKind } from '@/lib/scan/meta';
import { Colors } from '@/styles/tokens';

const QUICK: { kind: DetectionKind; label: string; sub: string }[] = [
  { kind: 'ai_audio', label: 'Audio Detect', sub: 'AI voice' },
  { kind: 'ai_video', label: 'Video Detect', sub: 'AI video' },
  { kind: 'lipsync', label: 'Lip-sync Detect', sub: 'Cuts & edits' },
];
const VERDICT_LABEL = { ai: 'AI', authentic: 'Real', tampered: 'Lip-sync' } as const;
const formatCount = (n: number | null) =>
  n == null
    ? null
    : n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : String(n);

export default function HomePage() {
  const { data: user } = useMe();
  const recent = useRecentScans(4);
  const trending = useTrending(3);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[13px] font-semibold text-ink-2">{today}</p>
        <h1 className="text-h1 font-bold">
          Hey {user?.firstName ?? user?.name}, verify something.
        </h1>
      </header>

      <section
        aria-label="Start an analysis"
        className="relative overflow-hidden rounded-[24px] p-6 text-white md:p-8"
        style={{ background: 'linear-gradient(135deg,#1a0030,#2d1060 55%,#0d0d2b)' }}
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 size-48 rounded-full bg-video/30 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-12 right-24 size-40 rounded-full bg-brand/30 blur-2xl"
        />
        <p className="relative text-label font-semibold uppercase tracking-[1.2px] text-white/80">
          5dot
        </p>
        <h2 className="relative mt-2 max-w-md text-h2 font-bold">
          Analyze a file, get an answer in under 3 minutes.
        </h2>
        <Link
          href="/scan"
          className="relative mt-5 inline-flex items-center gap-2 rounded-pill bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          <Upload className="size-4" aria-hidden /> Analyze now
        </Link>
      </section>

      <section aria-labelledby="quick-h">
        <h2 id="quick-h" className="mb-3 text-h3 font-semibold">
          Quick analysis
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {QUICK.map(({ kind, label, sub }) => {
            const m = DETECTION_META[kind];
            return (
              <Link
                key={kind}
                href={`/scan?kind=${kind}`}
                className="flex flex-col items-center gap-2 rounded-card bg-surface p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:bg-gray-100"
              >
                <span
                  className="flex size-11 items-center justify-center rounded-input"
                  style={{ background: `${m.color}20` }}
                >
                  <m.icon className="size-5" style={{ color: m.color }} aria-hidden />
                </span>
                <span className="text-[13px] font-semibold">{label}</span>
                <span className="text-caption text-ink-2">{sub}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Three signals, one verdict.</h2>
          <p className="text-[13px] text-ink-2">
            AI voice, AI-generated video, and lip-sync detection, all processed securely in the
            cloud.
          </p>
        </div>
        <div className="flex shrink-0 gap-2" aria-hidden>
          <Mic className="size-3.5" style={{ color: Colors.audioPink }} />
          <Video className="size-3.5" style={{ color: Colors.videoPurple }} />
          <Scissors className="size-3.5" style={{ color: Colors.tamper }} />
        </div>
      </Card>

      {trending.data && trending.data.length > 0 ? (
        <section aria-labelledby="trend-h">
          <h2
            id="trend-h"
            className="mb-3 text-label font-semibold uppercase tracking-[1.2px] text-ink-2"
          >
            Trending AI-generated clip
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {trending.data.map((t) => {
              const v = t.verdict ? VERDICT_LABEL[t.verdict] : null;
              const views = formatCount(t.youtube.viewCount);
              const count = formatCount(t.scanCount);
              return (
                <Card key={t.url} className="overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail */}
                  <img
                    src={t.youtube.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full bg-gray-200 object-cover"
                  />
                  <div className="p-3">
                    <p className="line-clamp-2 font-semibold">{t.youtube.title}</p>
                    <p className="mt-1 text-caption text-ink-2">
                      {t.youtube.channelTitle}
                      {views ? ` · ${views} views` : ''}
                      {count ? ` · ${count} analyzed this` : ''}
                    </p>
                    {v ? (
                      <p className="mt-1 text-caption font-semibold">
                        Result: {v}
                        {t.score != null ? ` · ${Math.round(t.score * 100)}%` : ''}
                      </p>
                    ) : null}
                    <Link
                      href={`/scan?url=${encodeURIComponent(t.url)}`}
                      className="mt-2 inline-block text-[13px] font-semibold text-brand hover:underline"
                    >
                      Analyze this clip
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="recent-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-h" className="text-h3 font-semibold">
            Recent analyses
          </h2>
          <Link href="/history" className="text-[13px] font-semibold text-brand hover:underline">
            See all
          </Link>
        </div>
        {recent.isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading recent analyses">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-card bg-gray-200 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : recent.isError ? (
          <p role="alert" className="text-ink-2">
            Couldn&apos;t load recent analyses.{' '}
            <button
              type="button"
              onClick={() => void recent.refetch()}
              className="font-semibold text-brand underline"
            >
              Try again
            </button>
          </p>
        ) : recent.data.length === 0 ? (
          <p className="py-6 text-center text-ink-2">No analyses yet, start one above.</p>
        ) : (
          <ul className="space-y-2">
            {recent.data.map((s) => (
              <li key={s.requestId}>
                <ScanListItem scan={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
