'use client';
import { CheckCircle2, Info, ShieldCheck, XCircle, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api/client';
import { FeedbackResponseSchema } from '@/lib/api/schemas';
import { cn } from '@/lib/cn';
import { useScan } from '@/lib/scan/hooks';
import { summarizeScan } from '@/lib/scan/summary';
import { VERDICT_COPY } from '@/lib/scan/verdicts';

type Correct = 'authentic' | 'ai' | 'unsure';
const OPTIONS: { key: Correct; label: string; Icon: LucideIcon; color: string }[] = [
  { key: 'authentic', label: 'Authentic', Icon: ShieldCheck, color: '#2B7A54' },
  { key: 'ai', label: 'AI-made', Icon: XCircle, color: '#B52E4A' },
  { key: 'unsure', label: 'Unsure', Icon: Info, color: '#4B5563' },
];
const REASONS = [
  'I made the recording',
  'Public source confirms',
  'Subject confirmed',
  'Familiar voice',
  'Other',
];

export function FeedbackForm() {
  const router = useRouter();
  const id = useSearchParams().get('scan');
  const scan = useScan(id ?? '');
  const { show, modal } = useErrorModal();
  const [verdict, setVerdict] = useState<Correct>('authentic');
  const [reasons, setReasons] = useState<string[]>([]);
  const [detail, setDetail] = useState('');
  const [allow, setAllow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!id) {
    return (
      <p className="py-10 text-center text-ink-2">
        Open this from a result page.{' '}
        <Link href="/history" className="font-semibold text-brand underline">
          Go to your analyses
        </Link>
      </p>
    );
  }
  const s = scan.data ? summarizeScan(scan.data) : null;
  const chip = s?.headline?.level
    ? VERDICT_COPY[s.headline.kind][s.headline.level].chip
    : 'Analyzing…';

  const submit = async () => {
    setBusy(true);
    try {
      await apiRequest('feedback', FeedbackResponseSchema, {
        method: 'POST',
        json: { scanId: id, correctVerdict: verdict, reasons, detail, allowAnonymizedCopy: allow },
      });
      setDone(true);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      show('Could not submit feedback', messageOf(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-h1 font-bold">What did we get wrong?</h1>
      <p className="mt-1 mb-5 text-ink-2">
        Your feedback trains the next model. We&apos;ll review every report within 48 hours.
      </p>

      <div className="mb-5 rounded-card bg-surface p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <p className="truncate font-semibold" title={s?.filename}>
          {s?.filename ?? '…'}
        </p>
        <p className="text-caption text-ink-2">Verdict · {chip}</p>
      </div>

      <fieldset className="mb-5">
        <legend className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          The correct answer is
        </legend>
        <div className="grid grid-cols-3 gap-3" role="radiogroup">
          {OPTIONS.map(({ key, label, Icon, color }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={verdict === key}
              onClick={() => setVerdict(key)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-card border-2 bg-surface py-4 font-semibold',
                verdict === key ? '' : 'border-transparent hover:bg-gray-100',
              )}
              style={verdict === key ? { borderColor: color, color } : undefined}
            >
              <Icon className="size-6" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-5">
        <legend className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          Why?
        </legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => {
            const on = reasons.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setReasons((p) => (on ? p.filter((x) => x !== r) : [...p, r]))}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold',
                  on
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-surface hover:bg-gray-100',
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-4">
        <label
          htmlFor="detail"
          className="mb-2 block text-label font-semibold uppercase tracking-[1.2px] text-ink-2"
        >
          Add detail
        </label>
        <textarea
          id="detail"
          rows={4}
          maxLength={2000}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="e.g. I recorded this myself on my iPhone last Tuesday…"
          className="w-full rounded-input border border-line bg-surface p-3 placeholder:text-ink-3"
        />
      </div>

      <label className="mb-5 flex cursor-pointer items-start gap-2 text-[13px] text-gray-700">
        <input
          type="checkbox"
          checked={allow}
          onChange={(e) => setAllow(e.target.checked)}
          className="mt-0.5 size-4 accent-[#C0376B]"
        />
        Allow 5dot to keep an anonymized copy for 30 days to verify and retrain.
      </label>

      <Button
        fullWidth
        loading={busy}
        disabled={done}
        variant={done ? 'green' : 'primary'}
        onClick={submit}
      >
        {done ? (
          <>
            <CheckCircle2 className="size-4" aria-hidden /> Feedback submitted!
          </>
        ) : busy ? (
          'Submitting…'
        ) : (
          'Submit feedback'
        )}
      </Button>
      {modal}
    </div>
  );
}
