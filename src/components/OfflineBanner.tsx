'use client';
import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

/** Global, non-dismissible; mounted only while offline (same copy as mobile). */
export function OfflineBanner() {
  if (useOnline()) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-gray-900 px-4 py-2 text-[13px] font-semibold text-white"
    >
      <WifiOff className="size-[13px]" aria-hidden />
      You&apos;re offline — some things may not work
    </div>
  );
}
