'use client';
import { ChevronDown, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SUPPORT_EMAIL } from '@/lib/billing';
import { useMe } from '@/lib/auth/session';

/**
 * Ported from mobile HelpSupportScreen. Entries that contradicted the shipped limits or the Privacy Policy were corrected
 * (file formats/size, "deleted within 24 hours", accuracy figure, store billing) — see the milestone-6 report.
 */
const FAQS: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: 'Using 5dot',
    items: [
      {
        q: 'How accurate is 5dot?',
        a: 'Real-world accuracy depends on file quality: higher resolution and bitrate give better results. Each result shows a score and how it compares to that check’s threshold, so you always know how certain the verdict is.',
      },
      {
        q: 'What file formats are supported?',
        a: 'Audio: wav, mp3, m4a, opus.\nVideo: mp4, mov.\n\nFiles can be up to 125 MB and 5 minutes long. You can also paste a link (YouTube, TikTok, Instagram, Facebook, X).',
      },
      {
        q: 'What’s the difference between Audio, Video, and Lip-sync modes?',
        a: 'Audio mode detects AI-synthesised or cloned voices (TTS, voice cloning).\n\nVideo mode checks whether the footage itself was AI-generated — synthesis artefacts and other signs it wasn’t captured by a real camera.\n\nLip-sync mode checks whether the lip movements match the speech, which can reveal editing or dubbing.',
      },
      {
        q: 'Can 5dot detect all AI-generated content?',
        a: 'No tool can guarantee 100% detection. New synthesis models emerge regularly, and very short clips (under 3 seconds) have less signal to analyse. If you’re unsure, submit a correction via the “Wrong?” button, it helps the model improve for everyone.',
      },
      {
        q: 'Where is my file processed?',
        a: 'Your file is uploaded over an encrypted connection and analysed in the cloud. For how long data is kept, see our Privacy Policy.',
      },
    ],
  },
  {
    section: 'Plans & billing',
    items: [
      {
        q: 'How do I upgrade?',
        a: 'Open Plans to compare Free, Pro and Team. Paid plans can’t be purchased on the web yet; we’ll announce it as soon as they can.',
      },
      {
        q: 'What happens when I run out of analyses?',
        a: 'Once you hit your monthly limit you can’t start new analyses until your plan resets or you upgrade. Your existing results remain fully accessible. Your Dashboard shows when your plan resets.',
      },
    ],
  },
  {
    section: 'Privacy & data',
    items: [
      {
        q: 'How do I delete my account and data?',
        a: 'Go to Profile → Privacy & security → Delete account. You’ll be asked to type DELETE to confirm. All analyses, results, and personal data are deleted and cannot be recovered.',
      },
    ],
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDown
          className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="whitespace-pre-line px-4 pb-4 text-[14px] leading-[21px] text-gray-700">{a}</p>
    </details>
  );
}

export default function HelpPage() {
  const { data: user } = useMe();
  const [bug, setBug] = useState('');
  const [sent, setSent] = useState(false);

  const sendBug = () => {
    const description = bug.trim();
    if (!description) return;
    const body = [
      description,
      '',
      '---',
      'App: 5dot web',
      `Browser: ${navigator.userAgent}`,
      `Account: ${user?.email ?? 'unknown'}`,
    ].join('\n');
    // Opens the user's mail client; nothing is sent from our servers.
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Bug report')}&body=${encodeURIComponent(body)}`;
    setSent(true);
    setBug('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-h1 font-bold">How can we help?</h1>
        <p className="mt-1 text-ink-2">
          Browse the FAQ below or reach out directly, we usually reply within a few hours.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Support%20request`}
          className="mt-3 inline-flex items-center gap-2 rounded-pill bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
        >
          <Mail className="size-4" aria-hidden /> Contact support
        </a>
      </header>

      {FAQS.map((s) => (
        <section key={s.section} aria-label={s.section}>
          <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
            {s.section}
          </h2>
          <div className="rounded-card bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {s.items.map((i) => (
              <Faq key={i.q} {...i} />
            ))}
          </div>
        </section>
      ))}

      <section id="bug" aria-labelledby="bug-h" className="scroll-mt-6">
        <h2
          id="bug-h"
          className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2"
        >
          Report a bug
        </h2>
        <div className="rounded-card bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <label htmlFor="bug-text" className="mb-2 block text-[14px] text-gray-700">
            Found something broken? Describe what happened and we&apos;ll look into it.
          </label>
          <textarea
            id="bug-text"
            rows={4}
            value={bug}
            onChange={(e) => setBug(e.target.value)}
            className="w-full rounded-input border border-line p-3"
          />
          <Button className="mt-3" disabled={!bug.trim()} onClick={sendBug}>
            <Send className="size-4" aria-hidden />{' '}
            {sent ? 'Opening your email app…' : 'Send report'}
          </Button>
        </div>
      </section>
    </div>
  );
}
