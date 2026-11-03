'use client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
    return (
      <ErrorModal
        open
        title={
          error && 'statusCode' in error && error.statusCode === 404
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
