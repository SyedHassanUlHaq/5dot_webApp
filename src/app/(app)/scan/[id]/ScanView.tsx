'use client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';
import { ErrorModal } from '@/components/ErrorModal';
import { useScan } from '@/lib/scan/hooks';
import { isScanDone } from '@/lib/scan/summary';
import { AnalyzingView } from './AnalyzingView';
import { ResultView } from './ResultView';

/** One route, state-driven (mirrors AnalyzingScreen → ResultScreen). Leaving and coming back resumes polling. */
export function ScanView({ id }: { id: string }) {
  const router = useRouter();
  const { data: scan, error, isPending, refetch } = useScan(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-20" aria-busy="true">
        <Loader2
          className="size-8 animate-spin text-brand motion-reduce:animate-none"
          aria-label="Loading"
        />
      </div>
    );
  }
  if (!scan) {
    // Definitive answers (404/403…) end here; anything else (offline, 5xx) is transient. Polling keeps retrying, so offer a manual retry too.
    const definitive =
      error instanceof ApiError &&
      error.statusCode >= 400 &&
      error.statusCode < 500 &&
      error.statusCode !== 429;
    if (!definitive) {
      return (
        <div role="alert" className="mx-auto max-w-sm py-20 text-center">
          <p className="mb-1 font-semibold">Couldn&apos;t reach the server</p>
          <p className="mb-4 text-ink-2">
            {error?.message ?? 'Please check your connection.'} We&apos;ll keep trying.
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try now
          </Button>
        </div>
      );
    }
    return (
      <ErrorModal
        open
        title={
          error instanceof ApiError && error.statusCode === 404
            ? 'Not found'
            : 'Could not load result'
        }
        message={error?.message ?? 'This analysis could not be found.'}
        dismissLabel="Back"
        onDismiss={() => router.replace('/history')}
      />
    );
  }
  if (scan.status === 'failed') {
    return (
      <ErrorModal
        open
        title="Analysis failed"
        message={scan.errorMessage || 'Something went wrong while analyzing this file.'}
        dismissLabel="OK"
        onDismiss={() => router.replace('/scan')}
      />
    );
  }
  if (!isScanDone(scan))
    return <AnalyzingView scan={scan} stalled={!!error} onRetry={() => void refetch()} />;
  return <ResultView scan={scan} />;
}
