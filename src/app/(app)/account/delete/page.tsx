'use client';
import { Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiVoid } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useSignOut } from '@/lib/auth/session';

const ITEMS = [
  'All analysis history and results',
  'Saved forensic reports',
  'Feedback and corrections submitted',
  'Account credentials and profile',
  'Active subscription (no refund for unused period)',
];

/** Port of the mobile delete-account sheet (same copy and "type DELETE" confirmation). */
export default function DeleteAccountPage() {
  const router = useRouter();
  const signOut = useSignOut();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = text.trim().toUpperCase() === 'DELETE';

  const remove = async () => {
    if (!canDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiVoid('users/me', { method: 'DELETE' }); // 204 No Content
      await signOut();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <span className="mb-4 flex size-[72px] items-center justify-center rounded-full bg-ai/10">
        <Trash2 className="size-[30px] text-ai" aria-hidden />
      </span>
      <h1 className="text-h1 font-bold">Delete account</h1>
      <p className="mt-2 text-gray-700">
        This will permanently delete your account, all analysis history, saved results, and personal
        data.
        <br />
        <br />
        This action <strong>cannot be undone</strong> and takes effect immediately. You will lose
        access to your Pro subscription.
      </p>
      <ul className="my-5 space-y-2 rounded-card bg-surface p-4">
        {ITEMS.map((i) => (
          <li key={i} className="flex items-center gap-2 text-[14px]">
            <X className="size-[13px] shrink-0 text-ai" aria-hidden /> {i}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
      >
        <label htmlFor="confirm" className="mb-2 block">
          Type <strong className="font-mono">DELETE</strong> to confirm
        </label>
        <input
          id="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type DELETE here"
          aria-describedby={error ? 'del-err' : undefined}
          className={`w-full rounded-input border-2 bg-surface px-4 py-3 ${canDelete ? 'border-ai' : 'border-line'}`}
        />
        {error ? (
          <p id="del-err" role="alert" className="mt-2 text-[13px] text-[#B52E4A]">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="danger"
          fullWidth
          className="mt-4"
          disabled={!canDelete}
          loading={busy}
        >
          <Trash2 className="size-4" aria-hidden />{' '}
          {busy ? 'Deleting…' : 'Permanently delete account'}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          className="mt-2"
          disabled={busy}
          onClick={() => router.back()}
        >
          Keep my account
        </Button>
      </form>
      <p className="mt-4 text-center text-caption text-ink-2">
        Prefer to ask us? See{' '}
        <Link href="/delete-account" className="font-semibold text-brand underline">
          other ways to request deletion
        </Link>
        .
      </p>
    </div>
  );
}
