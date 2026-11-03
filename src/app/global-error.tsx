'use client';

// Replaces the root layout when it crashes, so it must render <html>/<body> and can't rely on Tailwind or providers.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#F2F2F7', fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#6B7280', margin: '0 0 24px' }}>
            The app hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#C0376B',
              color: '#fff',
              border: 0,
              borderRadius: 50,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
