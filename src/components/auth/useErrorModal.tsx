'use client';
import { useCallback, useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import { ErrorModal } from '@/components/ErrorModal';

type Tone = 'error' | 'warning' | 'info';

export function useErrorModal() {
  const [state, setState] = useState<{ title: string; message: string; type: Tone } | null>(null);
  const show = useCallback(
    (title: string, message: string, type: Tone = 'error') => setState({ title, message, type }),
    [],
  );
  const modal = (
    <ErrorModal
      open={!!state}
      title={state?.title ?? ''}
      message={state?.message ?? ''}
      type={state?.type}
      onDismiss={() => setState(null)}
    />
  );
  return { show, modal };
}

export const messageOf = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;
