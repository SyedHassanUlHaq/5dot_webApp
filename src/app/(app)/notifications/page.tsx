'use client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BellOff,
  Cpu,
  MessageSquare,
  Shield,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api/client';
import {
  NotificationListSchema,
  NotificationSchema,
  type AppNotification,
} from '@/lib/api/schemas';
import { timeAgo } from '@/lib/scan/format';
import { Colors } from '@/styles/tokens';

const CFG: Record<string, { Icon: LucideIcon; color: string }> = {
  scan_complete_ai: { Icon: XCircle, color: Colors.aiRed },
  scan_complete_authentic: { Icon: Shield, color: Colors.authenticDark },
  scan_complete_tampered: { Icon: AlertTriangle, color: Colors.tamperDark },
  feedback_received: { Icon: MessageSquare, color: Colors.videoPurple },
  usage_warning: { Icon: BarChart3, color: Colors.tamper },
  model_updated: { Icon: Cpu, color: Colors.videoPurple },
  plan_upgraded: { Icon: Award, color: Colors.brand },
};
const DEFAULT = { Icon: Bell, color: Colors.textSecondary };

function bucket(iso: string): 'today' | 'yesterday' | 'earlier' {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000);
  return diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : 'earlier';
}
const LABEL = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' } as const;

export default function NotificationsPage() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest(`notifications?page=${pageParam}&limit=50`, NotificationListSchema),
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const unread = items.filter((n) => !n.read);

  const markRead = async (ids: string[]) => {
    qc.setQueryData(
      ['notifications'],
      (old: typeof q.data) =>
        old && {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            items: p.items.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
          })),
        },
    );
    await Promise.all(
      ids.map((id) =>
        apiRequest(`notifications/${encodeURIComponent(id)}/read`, NotificationSchema, {
          method: 'PATCH',
        }).catch(() => {}),
      ),
    );
  };

  const groups = (['today', 'yesterday', 'earlier'] as const)
    .map((k) => ({ k, list: items.filter((n) => bucket(n.createdAt) === k) }))
    .filter((g) => g.list.length);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 font-bold">Notifications</h1>
        {unread.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => void markRead(unread.map((n) => n.id))}>
            Mark all read
          </Button>
        ) : null}
      </div>
      {q.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-card bg-gray-200 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="py-8 text-center">
          <p className="mb-3 text-ink-2">{q.error.message}</p>
          <Button variant="outline" onClick={() => void q.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <BellOff className="mb-2 size-8 text-ink-3" aria-hidden />
          <p className="font-semibold">No notifications yet</p>
          <p className="text-ink-2">We&apos;ll let you know when something happens.</p>
        </div>
      ) : (
        <>
          {groups.map(({ k, list }) => (
            <section key={k} className="mb-5" aria-label={LABEL[k]}>
              <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
                {LABEL[k]}
              </h2>
              <ul className="space-y-2">
                {list.map((n: AppNotification) => {
                  const { Icon, color } = CFG[n.template] ?? DEFAULT;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => !n.read && void markRead([n.id])}
                        className="flex w-full items-start gap-3 rounded-card bg-surface p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:bg-gray-100"
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-input"
                          style={{ background: `${color}20` }}
                        >
                          <Icon className="size-[18px]" style={{ color }} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={n.read ? 'block' : 'block font-bold'}>{n.title}</span>
                          <span className="line-clamp-2 block text-[13px] text-ink-2">
                            {n.body}
                          </span>
                          <span className="block text-caption text-ink-2">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                        {!n.read ? (
                          <span
                            className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand"
                            aria-label="Unread"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {q.hasNextPage ? (
            <div className="text-center">
              <Button
                variant="outline"
                loading={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          ) : unread.length === 0 ? (
            <p className="py-4 text-center text-ink-2">You&apos;re all caught up</p>
          ) : null}
        </>
      )}
    </div>
  );
}
