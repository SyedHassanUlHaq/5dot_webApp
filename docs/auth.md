# Authentication & session security

Auth is the backend's own JWT system (**not** Firebase Auth): email + password with OTP verification, Google, Apple.
Access token 1 h, refresh token 30 d (backend values).

## Cookies

| Cookie    | Lifetime | Path   | Flags                                       | Purpose                                                       |
| --------- | -------- | ------ | ------------------------------------------- | ------------------------------------------------------------- |
| `5dot_rt` | 30 d     | `/`    | httpOnly, SameSite=Lax, Secure (production) | refresh token; its presence also tells middleware “signed in” |
| `5dot_at` | 55 min   | `/api` | httpOnly, SameSite=Lax, Secure (production) | access token (expires slightly before the JWT)                |

Neither is readable by page JavaScript; nothing token-like is put in `localStorage`/`sessionStorage` (asserted by an e2e test).
`Secure` cookies still work on `http://localhost` in Chrome.

## Flows

- **Sign in / verify / Google / Apple:** browser → `POST /api/auth/{signin,verify,google,apple}` → backend → tokens into cookies, response body is `{ user }` only.
- **Sign up:** `POST /api/auth/signup` → OTP email → `/verify` → `POST /api/auth/verify`. “Resend code” re-submits the signup (as mobile does), so the sign-up details **including the password are held in memory only** (`lib/auth/pending.tsx`) — never in storage or the URL. A reload loses them; the verify page then asks for the email and “Resend” sends the user back to sign-up.
- **Forgot / reset password:** `/forgot-password` → OTP email → `/reset-password`.
- **Sign out:** `POST /api/auth/signout` revokes the refresh token on the backend (best effort) and always clears the cookies.
- **Terms gate:** acceptance is a per-user flag in `localStorage` (`5dot_terms_accepted_<userId>`), exactly like mobile. It does not sync across devices/browsers. There is no backend field for it.

## Refresh (single-flight)

`/api/proxy` calls the backend with the access cookie. If the cookie is gone, or the backend answers 401, it refreshes **once** and retries.

- Concurrent requests carrying the same refresh token share one backend call (`server/refresh.ts`); the result is kept for 10 s so slightly-late requests holding the just-rotated token reuse it.
- Refresh token **rejected** (400/401/403/404) → cookies cleared, `401 SESSION_EXPIRED` → the browser client redirects to `/sign-in?reason=expired`.
- Backend **unreachable / 5xx** during refresh → `503`, session **kept** (mobile signs the user out here; the web app doesn't).
- Multipart bodies stream through the proxy and can't be replayed, so they aren't retried after a 401 (uploads use the direct path anyway).

**Limitation:** the single-flight map and the rate limiters are in-memory, per server instance. With several instances — and especially on serverless/Lambda-style hosting, where parallel requests land on different instances — two requests may refresh the same token concurrently; if the backend invalidates a refresh token once used, the loser gets a spurious sign-out _and clears the winner's fresh cookies_. This is why the recommended deployment is a **single long-running container** (see [deploy.md](./deploy.md)). Before scaling out, add a shared store (Redis/Upstash) for the de-dup, or confirm the backend tolerates re-use of a just-rotated refresh token (test: call `/auth/refresh` twice with the same token).

## CSRF

Mutating BFF routes require a same-origin `Origin` header (equal to the request origin or `NEXT_PUBLIC_APP_ORIGIN`); a missing or foreign Origin ⇒ 403. Cookies are SameSite=Lax as a second layer. The proxy applies this to every non-GET method.

## Rate limits (in-memory, per IP)

Auth actions 10/min per action · `upload-token` 30/min · proxy 600/min.
The client IP is read from `X-Forwarded-For`, counting **`TRUSTED_PROXY_HOPS`** entries from the _end_ (default 1; CloudFront + ALB = 2). Entries further left are attacker-controlled, so the first entry is never trusted. Wrong values either weaken the limit or put every user in one bucket; see [deploy.md](./deploy.md). Verified in a container with forged headers.

## The one token exposure: direct uploads

`POST /api/auth/upload-token` (POST + Origin check + rate limit + `Cache-Control: no-store`) returns the current **access** token so the browser can upload ≤125 MB straight to the backend. The refresh token never leaves its cookie. If you self-host Node you can remove even this with `NEXT_PUBLIC_UPLOAD_MODE=proxy`.

## Validation, logging

Every BFF route validates input with Zod before touching the backend. Error bodies use `{ error: { code, message, statusCode } }`. The server never logs tokens or request bodies, and the app has no `console.*` calls.

## Google sign-in

Uses Google Identity Services with the **same web client ID** the backend verifies (`GOOGLE_WEB_CLIENT_ID`, in `.env.example`). The browser gets an ID token and posts it to `/api/auth/google`.

**Action for you — Google Cloud Console → APIs & Services → Credentials → that OAuth 2.0 Web client → Authorized JavaScript origins:**

- `http://localhost:3000` (development)
- the production origin, e.g. `https://app.<your-domain>` (domain not purchased yet)
- any preview origin you want sign-in on (each Vercel preview URL needs adding; wildcards aren't allowed)

Authorized _redirect_ URIs are not needed (popup/ID-token flow). Changes can take a few minutes to apply. Not yet tested against Google for real (no origin registered).

## Sign in with Apple (stubbed)

The button renders only when `NEXT_PUBLIC_APPLE_SERVICES_ID` and `NEXT_PUBLIC_APPLE_REDIRECT_URI` are set. To enable:

1. Apple Developer → Identifiers → create a **Services ID** and enable Sign in with Apple, linked to the primary App ID (`com.fivedot.app`).
2. Configure the web domain (`app.<domain>`) and a return URL; Apple requires HTTPS and a verified domain (no `localhost` for production use).
3. **Backend change required:** the identity token's audience (`aud`) for web is the _Services ID_, not the iOS bundle ID. `/auth/apple` must accept both as valid audiences. This is not verifiable from this repo.
4. Set the two env vars and rebuild.

Apple only returns name/email on the user's first-ever authorization; the app forwards them to the backend then, as mobile does.

## Backend notes worth acting on

- The API currently **echoes any `Origin`** in `Access-Control-Allow-Origin` and sets `Allow-Credentials: true`. Auth is Bearer-token based so this isn't directly exploitable, but allow-list the web origin(s) instead.
- Direct uploads require CORS to keep allowing `authorization` and `content-type` for the web origin on `POST /v1/scans`.
