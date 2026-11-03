import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '5dot',
  description: 'Detect AI-generated or tampered media.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
