'use client';
import { ErrorScreen } from '@/components/ErrorScreen';

// Error details are deliberately NOT logged client-side or rendered: they can contain request data.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen onRetry={reset} />;
}
