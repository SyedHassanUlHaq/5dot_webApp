'use client';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SUPPORT_EMAIL } from '@/lib/billing';
import { useMe } from '@/lib/auth/session';

// Mobile's About screen also shows benchmark stats, a changelog and social links. Those are unverified/mobile-specific
// claims or URLs, so they are not repeated here (see report).
export default function AboutPage() {
  const { data: user } = useMe();
  const links = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/cookies', label: 'Cookie Policy' },
    { href: '/support', label: 'Support center' },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-h1 font-bold">About 5dot</h1>
      <Card>
        <p className="text-h2 font-bold">See past the fake.</p>
        <p className="mt-2 text-gray-700">
          5dot lets you upload or link audio and video and checks it for AI-generated voice,
          AI-generated video, and lip-sync or tamper manipulation.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-ink-2">Platform</dt>
            <dd className="font-semibold">Web app</dd>
          </div>
          {user ? (
            <div>
              <dt className="text-ink-2">Detection model</dt>
              <dd className="font-semibold">{user.modelVersion}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
      <section aria-label="Legal and support">
        <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          Legal &amp; support
        </h2>
        <Card className="divide-y divide-line p-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between px-4 py-3.5 font-semibold hover:bg-gray-100"
            >
              {l.label} <ExternalLink className="size-4 text-ink-3" aria-hidden />
            </Link>
          ))}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-between px-4 py-3.5 font-semibold hover:bg-gray-100"
          >
            {SUPPORT_EMAIL} <ExternalLink className="size-4 text-ink-3" aria-hidden />
          </a>
        </Card>
      </section>
    </div>
  );
}
