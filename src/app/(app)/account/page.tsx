'use client';
import { ChevronRight, PauseCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { messageOf, useErrorModal } from '@/components/auth/useErrorModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiVoid } from '@/lib/api/client';
import { useSignOut } from '@/lib/auth/session';

// Mobile also shows "Change password" (a non-functional stub) and three privacy switches that aren't saved anywhere.
// Neither is ported: a control that does nothing is worse than none.
export default function AccountPage() {
  const signOut = useSignOut();
  const { show, modal } = useErrorModal();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const deactivate = async () => {
    setBusy(true);
    try {
      await apiVoid('users/me/deactivate', { method: 'POST' });
      await signOut();
    } catch (e) {
      setConfirming(false);
      show('Could not deactivate account', messageOf(e, 'Something went wrong. Please try again.'));
      setBusy(false);
    }
  };

  const row = 'flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-100';
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-h1 font-bold">Privacy &amp; security</h1>
      <section aria-label="Your data">
        <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          Your data
        </h2>
        <Card className="divide-y divide-line p-0">
          <button type="button" className={row} onClick={() => setConfirming(true)}>
            <span className="flex size-9 items-center justify-center rounded-input bg-gray-100">
              <PauseCircle className="size-[17px] text-gray-700" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Deactivate account</span>
              <span className="block text-caption text-ink-2">
                Temporarily hide and disable your account — reversible
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-3" aria-hidden />
          </button>
          <Link href="/account/delete" className={row}>
            <span className="flex size-9 items-center justify-center rounded-input bg-ai/10">
              <Trash2 className="size-[17px] text-[#B52E4A]" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-[#B52E4A]">Delete account</span>
              <span className="block text-caption text-ink-2">
                Permanently delete your account and all associated data
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-3" aria-hidden />
          </Link>
        </Card>
      </section>
      <section aria-label="Legal">
        <h2 className="mb-2 text-label font-semibold uppercase tracking-[1.2px] text-ink-2">
          Legal
        </h2>
        <Card className="divide-y divide-line p-0">
          {[
            ['/privacy', 'Privacy Policy'],
            ['/legal/terms', 'Terms of Service'],
            ['/legal/cookies', 'Cookie Policy'],
          ].map(([href, label]) => (
            <Link key={href} href={href!} className={row}>
              <span className="flex-1 font-semibold">{label}</span>
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </Link>
          ))}
        </Card>
      </section>
      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="Deactivate account"
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={deactivate}>
              Deactivate
            </Button>
          </>
        }
      >
        Your account will be hidden and disabled. This is reversible — contact support to reactivate
        it. Continue?
      </Modal>
      {modal}
    </div>
  );
}
