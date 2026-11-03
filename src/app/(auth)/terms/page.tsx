'use client';
import { ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useMe, useSignOut, useTerms } from '@/lib/auth/session';

/** Port of TermsGateScreen: a signed-in user must accept before using the app. */
export default function TermsGatePage() {
  const router = useRouter();
  const { data: user } = useMe();
  const { accepted, accept } = useTerms(user?.id);
  const signOut = useSignOut();

  useEffect(() => {
    if (accepted) router.replace('/');
  }, [accepted, router]);

  return (
    <>
      <span className="mb-5 flex size-16 items-center justify-center rounded-[20px] bg-brand/10">
        <FileText className="size-7 text-brand" aria-hidden />
      </span>
      <h1 className="mb-3 text-[26px] font-extrabold">Before you continue</h1>
      <p className="mb-6 leading-[22px] text-ink-2">
        Please review and accept our Terms of Service and Privacy Policy to keep using 5dot. They
        explain how we process the files you submit and what we do with your data.
      </p>
      <div className="mb-8 flex flex-col">
        <Link
          href="/legal/terms"
          target="_blank"
          className="flex items-center gap-2 py-2.5 font-semibold text-brand hover:underline"
        >
          <ExternalLink className="size-[15px]" aria-hidden /> Terms of Service
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
        <Link
          href="/privacy"
          target="_blank"
          className="flex items-center gap-2 py-2.5 font-semibold text-brand hover:underline"
        >
          <ExternalLink className="size-[15px]" aria-hidden /> Privacy Policy
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      </div>
      <Button fullWidth disabled={!user || accepted === null} onClick={accept}>
        I agree, continue
      </Button>
      <button
        type="button"
        onClick={signOut}
        className="mt-3 w-full py-2 text-center font-semibold text-ink-2 hover:underline"
      >
        Decline &amp; sign out
      </button>
    </>
  );
}
