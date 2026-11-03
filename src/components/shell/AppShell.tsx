'use client';
import { BarChart3, Home, LogOut, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { cn } from '@/lib/cn';
import { useMe, useSignOut } from '@/lib/auth/session';

// Mobile's second tab is labelled "Dashboard" (HistoryScreen). Plans/Profile join in the next milestone.
const NAV = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/history', label: 'Dashboard', Icon: BarChart3 },
] as const;

const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: user } = useMe();
  const signOut = useSignOut();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <OfflineBanner />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-input focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 block px-2" aria-label="5dot home">
          <Image
            src="/logo-full.png"
            alt=""
            width={56}
            height={74}
            className="h-auto w-14"
            priority
          />
        </Link>
        <Link
          href="/scan"
          className="mb-4 flex items-center justify-center gap-2 rounded-pill bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          <Plus className="size-4" aria-hidden /> New analysis
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(path, href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-input px-3 py-2.5 font-semibold',
                isActive(path, href) ? 'bg-brand/10 text-brand' : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              <Icon className="size-[18px]" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-2 flex items-center gap-3 px-2">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: user?.avatarColor ?? '#C0376B' }}
              aria-hidden
            >
              {user?.avatarInitials}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user?.name}</span>
              <span className="block text-caption capitalize text-ink-2">{user?.plan} plan</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-input px-3 py-2.5 font-semibold text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="size-[18px]" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-20 md:pb-0">
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </main>
      </div>

      {/* Phone bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface md:hidden"
      >
        <Link
          href="/"
          aria-current={isActive(path, '/') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
            isActive(path, '/') ? 'text-brand' : 'text-ink-2',
          )}
        >
          <Home className="size-5" aria-hidden /> Home
        </Link>
        <Link
          href="/scan"
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-brand"
        >
          <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-lg">
            <Plus className="size-6" aria-hidden />
          </span>
          Analyze
        </Link>
        <Link
          href="/history"
          aria-current={isActive(path, '/history') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
            isActive(path, '/history') ? 'text-brand' : 'text-ink-2',
          )}
        >
          <BarChart3 className="size-5" aria-hidden /> Dashboard
        </Link>
      </nav>
    </div>
  );
}
