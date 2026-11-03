import Image from 'next/image';
import { PatternBackground } from '@/components/PatternBackground';
import { PendingAuthProvider } from '@/lib/auth/pending';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PendingAuthProvider>
      <div className="relative isolate min-h-dvh overflow-hidden">
        <PatternBackground />
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
          <Image
            src="/logo-full.png"
            alt="5dot"
            width={96}
            height={128}
            priority
            className="mb-6 h-auto w-24"
          />
          {children}
        </main>
      </div>
    </PendingAuthProvider>
  );
}
