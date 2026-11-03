'use client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ScanListItem } from '@/components/scan/ScanListItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useMe } from '@/lib/auth/session';
import { useHistory, useWeeklyStats } from '@/lib/scan/hooks';
import { DETECTION_META } from '@/lib/scan/meta';
import { summarizeScan } from '@/lib/scan/summary';
import { LEVEL_TONE, TONE_COLOR, TONE_TEXT_COLOR, VERDICT_COPY } from '@/lib/scan/verdicts';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
type Filter = 'all' | 'ai' | 'authentic';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI' },
  { id: 'authentic', label: 'Real' },
];

export function Dashboard() {
  const { data: user } = useMe();
  const stats = useWeeklyStats();
  const history = useHistory();
  const [filter, setFilter] = useState<Filter>('all');

  const scans = useMemo(() => history.data?.pages.flatMap((p) => p.items) ?? [], [history.data]);
  const last = scans[0] ? summarizeScan(scans[0]) : null;
  // Filtering is client-side over the loaded pages (same as mobile's single fetched list).
  const visible = useMemo(
    () =>
      filter === 'all'
        ? scans
        : scans.filter((s) => {
            const f = summarizeScan(s).headline?.flagged;
            return filter === 'ai' ? f === true : f === false;
          }),
    [scans, filter],
  );

  const weeklyMax = stats.data ? Math.max(1, ...stats.data.dailyBreakdown.map((d) => d.scans)) : 1;
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6
  const usedPct = user?.scansLimitThisMonth
    ? Math.min(100, (user.scansUsedThisMonth / user.scansLimitThisMonth) * 100)
    : 0;
  const daysUntilReset = user?.planResetDate
    ? Math.max(0, Math.ceil((new Date(user.planResetDate).getTime() - Date.now()) / 86_400_000))
    : null;
  const lastTone = last?.headline?.level ? LEVEL_TONE[last.headline.level] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="week-h"
          className="rounded-card p-5 text-white"
          style={{ background: '#1C1C1E' }}
        >
          <h2
            id="week-h"
            className="text-label font-semibold uppercase tracking-[1.2px] text-white/70"
          >
            This week
          </h2>
          <p className="mt-1 text-h2 font-bold">
            {stats.data ? `${stats.data.totalScans} analyses` : stats.isError ? 'N/A' : '…'}
          </p>
          <p className="text-[13px] text-white/70">
            {stats.data ? `${stats.data.flaggedScans} flagged` : ''}
          </p>
          <div
            className="mt-4 flex h-16 items-end gap-2"
            role="img"
            aria-label={
              stats.data
                ? `Analyses per day this week: ${stats.data.dailyBreakdown.map((d) => d.scans).join(', ')}`
                : 'No weekly data'
            }
          >
            {(stats.data?.dailyBreakdown ?? DAYS.map((d) => ({ day: d, scans: 0 }))).map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn('w-full rounded-sm', i === todayIdx ? 'bg-brand' : 'bg-white/40')}
                  style={{ height: `${Math.max(6, (d.scans / weeklyMax) * 100)}%` }}
                />
                <span className="text-[10px] text-white/70" aria-hidden>
                  {DAYS[i]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
                {user?.plan ?? 'free'} plan
              </h2>
              <span className="rounded-pill bg-authentic/15 px-2 py-0.5 text-[11px] font-bold text-authentic-dark">
                Active
              </span>
            </div>
            <p className="mt-2 font-bold">
              {user?.scansUsedThisMonth ?? 0} / {user?.scansLimitThisMonth ?? '∞'} scans
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label="Monthly scans used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usedPct)}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
            </div>
            <p className="mt-2 text-caption text-ink-2">
              {daysUntilReset !== null ? `Resets in ${daysUntilReset} days` : ''}
            </p>
          </Card>
          <Card className={cn(last && 'transition-colors hover:bg-gray-100')}>
            <h2 className="text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
              Last verdict
            </h2>
            {last?.headline?.level && lastTone ? (
              <Link href={`/scan/${encodeURIComponent(last.requestId)}`} className="mt-2 block">
                <span
                  className="inline-block rounded-pill px-2.5 py-1 text-caption font-bold"
                  style={{
                    background: `${TONE_COLOR[lastTone]}20`,
                    color: TONE_TEXT_COLOR[lastTone],
                  }}
                >
                  {VERDICT_COPY[last.headline.kind][last.headline.level].chip}
                  {last.headline.scorePct !== null ? ` · ${last.headline.scorePct}%` : ''}
                </span>
                <span className="mt-1 line-clamp-2 block text-[13px]">{last.filename}</span>
                <span className="sr-only">{DETECTION_META[last.headline.kind].label}</span>
              </Link>
            ) : last ? (
              <Link
                href={`/scan/${encodeURIComponent(last.requestId)}`}
                className="mt-2 block text-[13px]"
              >
                Still analyzing: {last.filename}
              </Link>
            ) : (
              <p className="mt-2 text-[13px] text-ink-2">No analyses yet</p>
            )}
          </Card>
        </div>
      </div>

      <Link
        href="/scan"
        className="flex items-center justify-center gap-2 rounded-pill bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark md:hidden"
      >
        <Plus className="size-4" aria-hidden /> Start new analysis
      </Link>

      <section aria-labelledby="activity-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="activity-h" className="text-h3 font-semibold">
            Activity
          </h2>
          <div
            role="group"
            aria-label="Filter activity"
            className="inline-flex rounded-pill bg-gray-200 p-1"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-pill px-4 py-1.5 text-[13px] font-semibold',
                  filter === f.id ? 'bg-brand text-white' : 'text-gray-700 hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {history.isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading activity">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-card bg-gray-200 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : history.isError ? (
          <div role="alert" className="py-6 text-center">
            <p className="mb-3 text-ink-2">{history.error.message}</p>
            <Button variant="outline" onClick={() => void history.refetch()}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-ink-2">
            {scans.length === 0
              ? 'No analyses yet, start one above.'
              : `No ${filter === 'ai' ? 'AI' : 'real'} results in what's loaded.`}
            {scans.length > 0 && history.hasNextPage ? ' Load more to keep looking.' : ''}
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.requestId}>
                <ScanListItem scan={s} />
              </li>
            ))}
          </ul>
        )}

        {history.hasNextPage ? (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              loading={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
