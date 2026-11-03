'use client';
import { Check, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VerdictRing } from '@/components/scan/VerdictRing';
import { Button } from '@/components/ui/Button';
import type { ScanResponse } from '@/lib/api/schemas';
import { cn } from '@/lib/cn';
import { DETECTION_KINDS, DETECTION_META } from '@/lib/scan/meta';

export function AnalyzingView({
  scan,
  stalled,
  onRetry,
}: {
  scan: ScanResponse;
  stalled: boolean;
  onRetry: () => void;
}) {
  // Measured from the server's createdAt so a resumed scan shows real elapsed time (mobile counts from mount).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(scan.createdAt).getTime()) / 1000));
  const progress = Math.round(scan.progress);
  const kinds = DETECTION_KINDS.filter((k) => scan.detections[k]?.requested);
  const primary = DETECTION_META[kinds[0] ?? 'ai_video'];

  return (
    <div className="mx-auto max-w-lg text-center">
      <VerdictRing analyzing color="#C0376B" label="Analyzing" scorePct={progress} />
      {/* Announce coarse progress politely (every 10%), not every poll. */}
      <p className="sr-only" role="status" aria-live="polite">
        Analyzing {scan.filename}. {Math.floor(progress / 10) * 10}% complete.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-card bg-surface p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-input"
          style={{ background: `${primary.color}20` }}
        >
          <primary.icon className="size-5" style={{ color: primary.color }} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold" title={scan.filename}>
            {scan.filename}
          </span>
          <span className="block text-caption text-ink-2">{elapsed}s elapsed</span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-tamper to-video transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-10 text-right text-[13px] font-semibold">{progress}%</span>
      </div>

      <section className="mt-6 text-left" aria-labelledby="checks-h">
        <h2
          id="checks-h"
          className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2"
        >
          Checks
        </h2>
        <ul className="space-y-2">
          {kinds.map((k) => {
            const status = scan.detections[k]?.status ?? 'pending';
            const done = status === 'complete';
            const failed = status === 'failed';
            const active = status === 'processing';
            return (
              <li
                key={k}
                className="flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-white',
                    done
                      ? 'bg-authentic-dark'
                      : failed
                        ? 'bg-ai'
                        : active
                          ? 'bg-brand'
                          : 'bg-gray-300',
                  )}
                  aria-hidden
                >
                  {done ? (
                    <Check className="size-3" />
                  ) : failed ? (
                    <X className="size-3" />
                  ) : active ? (
                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                  ) : null}
                </span>
                <span className={cn('flex-1', done || active ? 'font-semibold' : 'text-ink-2')}>
                  {DETECTION_META[k].label}
                </span>
                <span className="text-caption text-ink-2">
                  {done ? 'done' : failed ? 'failed' : active ? 'running…' : 'pending'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {stalled ? (
        <p role="alert" className="mt-4 text-[13px] text-ink-2">
          Having trouble reaching the server; still trying.{' '}
          <button type="button" onClick={onRetry} className="font-semibold text-brand underline">
            Retry now
          </button>
        </p>
      ) : null}

      <p className="mt-6 text-[13px] text-ink-2">
        This usually takes under 3 minutes. You can leave this page. The analysis keeps running and
        appears in your recent analyses.
      </p>
      <Link href="/" className="mt-3 inline-block">
        <Button variant="outline">Leave and keep analyzing</Button>
      </Link>
    </div>
  );
}
