'use client';
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { ScoreTimeline, type TimelineSeries } from '@/components/scan/ScoreTimeline';
import { VerdictRing } from '@/components/scan/VerdictRing';
import { Button } from '@/components/ui/Button';
import type { ScanResponse } from '@/lib/api/schemas';
import { downloadReportPdf } from '@/lib/scan/api';
import { timeAgo } from '@/lib/scan/format';
import { DETECTION_META } from '@/lib/scan/meta';
import { chunkScoresFor, summarizeScan, type DetectionSummary } from '@/lib/scan/summary';
import {
  CHECK_DESCRIPTION,
  LEVEL_ICON,
  LEVEL_TONE,
  TONE_COLOR,
  TONE_TEXT_COLOR,
  VERDICT_COPY,
} from '@/lib/scan/verdicts';

function DetectionRow({ item, showDetails }: { item: DetectionSummary; showDetails: boolean }) {
  const meta = DETECTION_META[item.kind];
  const status = item.state?.status ?? 'pending';
  const tone = item.level ? LEVEL_TONE[item.level] : null;
  const Lvl = item.level ? LEVEL_ICON[item.level] : null;
  return (
    <li className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-input"
        style={{ background: `${meta.color}20` }}
      >
        <meta.icon className="size-[18px]" style={{ color: meta.color }} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{meta.label}</span>
        {item.scorePct !== null ? (
          <>
            <span className="block text-caption text-ink-2">{CHECK_DESCRIPTION[item.kind]}</span>
            {showDetails ? (
              <span className="mt-0.5 block text-[11px] text-ink-2">
                Score {item.scorePct}% · flags at {item.thresholdPct}%
              </span>
            ) : null}
          </>
        ) : status === 'failed' ? (
          <span className="block text-caption text-ai">Couldn&apos;t complete this check</span>
        ) : (
          <span className="block text-caption text-ink-2">Still analyzing…</span>
        )}
      </span>
      {item.level && tone && Lvl ? (
        <span
          className="flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-caption font-bold"
          style={{ background: `${TONE_COLOR[tone]}20`, color: TONE_TEXT_COLOR[tone] }}
        >
          <Lvl className="size-3" aria-hidden />
          {VERDICT_COPY[item.kind][item.level].chip}
          {item.scorePct !== null ? ` · ${item.scorePct}%` : ''}
        </span>
      ) : status === 'failed' ? (
        <AlertCircle className="size-[18px] text-ai" aria-label="Failed" />
      ) : (
        <Loader2
          className="size-4 animate-spin text-ink-3 motion-reduce:animate-none"
          aria-label="Analyzing"
        />
      )}
    </li>
  );
}

export function ResultView({ scan }: { scan: ScanResponse }) {
  const [showDetails, setShowDetails] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { show, modal } = useErrorModal();
  const summary = summarizeScan(scan);
  const { headline } = summary;

  const series: TimelineSeries[] = summary.detections
    .filter((d) => d.result)
    .map((d) => ({
      key: d.kind,
      label: DETECTION_META[d.kind].shortLabel,
      color: DETECTION_META[d.kind].color,
      threshold: d.result?.threshold ?? 0.5,
      points: chunkScoresFor(scan.chunks ?? [], d.kind),
    }))
    .filter((s) => s.points.length > 0);

  const copy = headline?.level ? VERDICT_COPY[headline.kind][headline.level] : null;
  const tone = headline?.level ? LEVEL_TONE[headline.level] : null;
  const color = tone ? TONE_COLOR[tone] : '#C0376B';

  const pdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadReportPdf(scan.requestId, scan.filename);
    } catch (e) {
      show('Could not download report', messageOf(e, 'Something went wrong. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Link
        href="/history"
        className="mb-2 inline-flex items-center gap-1 rounded-input py-2 pr-3 font-semibold text-gray-700 hover:text-ink"
      >
        <ArrowLeft className="size-5" aria-hidden /> Back
      </Link>

      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="text-center">
          <VerdictRing
            color={color}
            textColor={tone ? TONE_TEXT_COLOR[tone] : undefined}
            Icon={headline?.level ? LEVEL_ICON[headline.level] : undefined}
            label={copy?.chip ?? 'Analyzing'}
            scorePct={headline?.scorePct}
            analyzing={!headline}
          />
          {copy ? (
            <div className="mt-2" aria-live="polite">
              <h1 className="text-h2 font-bold">{copy.title}</h1>
              <p className="mt-1 text-ink-2">{copy.subtitle}</p>
              <p className="mt-1 text-caption text-ink-2">Automated result, not a guarantee.</p>
            </div>
          ) : null}
          <p className="mt-3 truncate text-[13px] font-semibold" title={scan.filename}>
            {scan.filename}
          </p>
          <p className="text-caption text-ink-2">
            {scan.completedAt ? `Analyzed ${timeAgo(scan.completedAt)}` : 'Still analyzing'}
          </p>
        </div>

        <div className="mt-6 lg:mt-0">
          <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
            What we checked
          </h2>
          <ul className="space-y-2.5">
            {summary.detections.map((d) => (
              <DetectionRow key={d.kind} item={d} showDetails={showDetails} />
            ))}
          </ul>

          {summary.detections.some((d) => d.scorePct !== null) ? (
            <button
              type="button"
              aria-expanded={showDetails}
              onClick={() => setShowDetails((v) => !v)}
              className="mx-auto mt-3 flex items-center gap-1 py-2 text-[13px] font-semibold text-gray-700 hover:text-ink"
            >
              {showDetails ? 'Hide technical details' : 'Show technical details'}
              {showDetails ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          {showDetails && series.length > 0 ? (
            <div className="mt-2">
              <ScoreTimeline series={series} />
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            {headline ? (
              <Link
                href={`/feedback?scan=${encodeURIComponent(scan.requestId)}`}
                className="flex flex-1 items-center justify-center rounded-pill border-[1.5px] border-line px-6 py-3.5 font-semibold hover:bg-gray-100"
              >
                Wrong?
              </Link>
            ) : (
              <Button variant="outline" disabled className="flex-1">
                Wrong?
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              disabled={scan.status !== 'complete'}
              loading={downloading}
              onClick={pdf}
            >
              <Download className="size-4" aria-hidden /> PDF
            </Button>
          </div>
        </div>
      </div>
      {modal}
    </div>
  );
}
