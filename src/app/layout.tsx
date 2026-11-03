import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: '5dot',
  description: 'Detect AI-generated or tampered media.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers opts the tree into dynamic rendering, which is required for per-request CSP nonces.
  await headers();
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
