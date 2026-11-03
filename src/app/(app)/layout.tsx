'use client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useMe, useTerms } from '@/lib/auth/session';

/** Guards the signed-in area: loads the user, enforces the terms gate. App shell/nav arrives with the scan milestone. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const { accepted } = useTerms(me.data?.id);

  useEffect(() => {
    if (accepted === false) router.replace('/terms');
  }, [accepted, router]);

  if (me.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">{me.error.message}</p>
        <Button onClick={() => me.refetch()}>Try again</Button>
      </main>
    );
  }
  if (!me.data || accepted !== true) {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading" />
      </main>
    );
  }
  return <>{children}</>;
}
