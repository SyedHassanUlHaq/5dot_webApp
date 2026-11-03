'use client';
import { Button } from '@/components/ui/Button';
import { useMe, useSignOut } from '@/lib/auth/session';

// Placeholder until the Home screen is built in the scan milestone.
export default function HomePage() {
  const { data: user } = useMe();
  const signOut = useSignOut();
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-h1 font-bold">Hi {user?.firstName ?? user?.name}</h1>
      <p className="text-ink-2">
        Signed in as {user?.email} · plan: {user?.plan}
      </p>
      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}
