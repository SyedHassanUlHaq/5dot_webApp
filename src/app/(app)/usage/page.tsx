'use client';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { useMe } from '@/lib/auth/session';
import { useWeeklyStats } from '@/lib/scan/hooks';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function UsagePage() {
  const { data: user } = useMe();
  const stats = useWeeklyStats();
  const used = user?.scansUsedThisMonth ?? 0;
  const limit = user?.scansLimitThisMonth ?? null;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const max = stats.data ? Math.max(1, ...stats.data.dailyBreakdown.map((d) => d.scans)) : 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-h1 font-bold">Usage stats</h1>
      <Card>
        <h2 className="text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          This month
        </h2>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-semibold capitalize">{user?.plan ?? 'free'} plan</p>
            <p className="text-caption text-ink-2">
              Resets{' '}
              {user?.planResetDate ? new Date(user.planResetDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <p>
            <span className="text-h1 font-extrabold">{used}</span>{' '}
            <span className="text-ink-2">/ {limit ?? '∞'}</span>
          </p>
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Monthly analyses used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-caption text-ink-2">
          <span>{Math.round(pct)}% used</span>
          <span>{limit !== null ? `${Math.max(0, limit - used)} left` : 'Unlimited'}</span>
        </div>
      </Card>
      <Card>
        <h2 className="text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          Analyses per day, this week
        </h2>
        {stats.isError ? (
          <p role="alert" className="mt-3 text-ink-2">
            {stats.error.message}
          </p>
        ) : (
          <div
            className="mt-4 flex h-40 items-end gap-3"
            role="img"
            aria-label={
              stats.data
                ? `Analyses per day: ${stats.data.dailyBreakdown.map((d) => d.scans).join(', ')}`
                : 'Loading'
            }
          >
            {(stats.data?.dailyBreakdown ?? DAYS.map((d) => ({ day: d, scans: 0 }))).map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-caption text-ink-2" aria-hidden>
                  {d.scans}
                </span>
                <div className="flex w-full flex-1 items-end rounded bg-bg">
                  <div
                    className={cn('w-full rounded', i === todayIdx ? 'bg-brand' : 'bg-brand/50')}
                    style={{ height: `${Math.max(4, (d.scans / max) * 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'text-caption',
                    i === todayIdx ? 'font-bold text-brand' : 'text-ink-2',
                  )}
                  aria-hidden
                >
                  {DAYS[i]}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
