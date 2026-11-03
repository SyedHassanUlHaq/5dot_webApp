import { AlertTriangle, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

/** Port of mobile ErrorBoundary screen. (Mobile says "We've logged it"; the web app has no crash reporting yet, so it doesn't claim that.) */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-8 text-center">
      <span className="mb-5 flex size-16 items-center justify-center rounded-[20px] bg-ai/10">
        <AlertTriangle className="size-7 text-ai" aria-hidden />
      </span>
      <h1 className="mb-2 text-[26px] font-extrabold">Something went wrong</h1>
      <p className="mb-6 text-ink-2">The app hit an unexpected error. Please try again.</p>
      <Button onClick={onRetry}>Try again</Button>
      <Link href="/" className="mt-4 font-semibold text-brand hover:underline">
        Go to home
      </Link>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-8 text-center">
      <span className="mb-5 flex size-16 items-center justify-center rounded-[20px] bg-brand/10">
        <FileQuestion className="size-7 text-brand" aria-hidden />
      </span>
      <h1 className="mb-2 text-[26px] font-extrabold">Page not found</h1>
      <p className="mb-6 text-ink-2">That page doesn&apos;t exist or has moved.</p>
      <Link
        href="/"
        className="rounded-pill bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
      >
        Go to home
      </Link>
    </main>
  );
}
