'use client';
import { useEffect, useRef, useState } from 'react';

interface GsiCredentialResponse {
  credential?: string;
}
interface GoogleId {
  initialize(cfg: {
    client_id: string;
    callback: (r: GsiCredentialResponse) => void;
    ux_mode?: 'popup';
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    AppleID?: {
      auth: {
        init(cfg: Record<string, unknown>): void;
        signIn(): Promise<{
          authorization: { id_token: string; code?: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const loaded = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loaded.delete(src);
        reject(new Error('script load failed'));
      };
      document.head.appendChild(s);
    });
    loaded.set(src, p);
  }
  return p;
}

/**
 * Google Identity Services button. Uses the same *web* client ID the backend verifies ID tokens against.
 * (Google requires its own rendered button; custom-styled buttons can't return an ID token.)
 */
export function GoogleButton({
  onIdToken,
  onError,
}: {
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const cb = useRef({ onIdToken, onError });
  cb.current = { onIdToken, onError };

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (r) => {
            if (r.credential) cb.current.onIdToken(r.credential);
            else cb.current.onError('Google sign-in did not return an ID token.');
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(ref.current.clientWidth || 360, 400),
        });
      })
      .catch(() =>
        cb.current.onError(
          'Could not load Google sign-in. Check your connection or ad blocker and try again.',
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;
  return (
    <div
      ref={ref}
      className="flex min-h-10 w-full justify-center"
      aria-label="Continue with Google"
    />
  );
}

export interface AppleResult {
  identityToken: string;
  authorizationCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

/** Stubbed: renders only when NEXT_PUBLIC_APPLE_SERVICES_ID and NEXT_PUBLIC_APPLE_REDIRECT_URI are set. */
export function AppleButton({
  onResult,
  onError,
}: {
  onResult: (r: AppleResult) => void;
  onError: (message: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;
  const redirectURI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI;
  const [busy, setBusy] = useState(false);
  if (!clientId || !redirectURI) return null;

  const click = async () => {
    setBusy(true);
    try {
      await loadScript(
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      );
      window.AppleID!.auth.init({ clientId, scope: 'name email', redirectURI, usePopup: true });
      const r = await window.AppleID!.auth.signIn();
      onResult({
        identityToken: r.authorization.id_token,
        authorizationCode: r.authorization.code ?? null,
        email: r.user?.email ?? null,
        firstName: r.user?.name?.firstName ?? null,
        lastName: r.user?.name?.lastName ?? null,
      });
    } catch (e) {
      // Apple JS rejects with {error:'popup_closed_by_user'} when cancelled — not an error to show.
      const code = (e as { error?: string } | null)?.error;
      if (code !== 'popup_closed_by_user' && code !== 'user_cancelled_authorize') {
        onError('Could not sign in with Apple. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-pill bg-black py-3 text-[15px] font-semibold text-white disabled:opacity-60"
    >
      <svg viewBox="0 0 384 512" className="size-4 fill-current" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      {busy ? 'Signing in…' : 'Continue with Apple'}
    </button>
  );
}
