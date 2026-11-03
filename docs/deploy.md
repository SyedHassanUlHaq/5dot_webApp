# Deploying

Target: **`app.<your-domain>`** (the domain isn't purchased yet; every `<domain>` below is a placeholder). The marketing site stays
on the apex / `www`, deployed separately from `../5dot_web`.

## Hosting choice

|                                     | Vercel (serverless)                                                                                  | Self-hosted Node (`next start`, Docker/VM/Fly/Render) |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| File upload                         | **direct to backend** (default) — required, because serverless request bodies are capped at a few MB | direct (default) or `NEXT_PUBLIC_UPLOAD_MODE=proxy`   |
| Token exposure                      | access token reaches JS for uploads only                                                             | proxy mode: none                                      |
| Refresh single-flight / rate limits | per function instance (best effort)                                                                  | exact on a single instance                            |
| Effort                              | lowest                                                                                               | you run the process, TLS and restarts                 |

Default recommendation: **Vercel + direct upload**, and revisit if you need strict token opacity or horizontal scale (then add a shared store, see [auth.md](./auth.md)).

## Environment variables

`NEXT_PUBLIC_*` are **inlined at build time**: set them in the build environment, and rebuild when they change.

| Variable                                                          | Required         | Notes                                                                             |
| ----------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`                                        | yes              | `https://api.axioware.tech/v1`. Also feeds the CSP `connect-src` (direct uploads) |
| `API_BASE_URL`                                                    | no               | server-only runtime override for the BFF                                          |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`                                | yes (for Google) | must equal the backend's `GOOGLE_WEB_CLIENT_ID`                                   |
| `NEXT_PUBLIC_APP_ORIGIN`                                          | yes              | e.g. `https://app.<domain>`; used by the CSRF Origin check                        |
| `NEXT_PUBLIC_APPLE_SERVICES_ID`, `NEXT_PUBLIC_APPLE_REDIRECT_URI` | no               | Apple button hidden unless both set                                               |
| `NEXT_PUBLIC_UPLOAD_MODE`                                         | no               | `direct` (default) or `proxy`                                                     |
| `NEXT_PUBLIC_BILLING_ENABLED`                                     | no               | keep `false` until [billing.md](./billing.md) is built                            |

No secrets are needed by this app. Do not copy anything from `faikNew/.env`, credentials, Firebase admin JSON or `google-services.json`.

## Steps

1. **Project:** import the repo; build `npm run build`, start `npm start` (Vercel detects Next.js). Developed and tested on Node 22.
2. **DNS:** `app` CNAME → host target. TLS is automatic on Vercel; self-hosted needs a certificate and a reverse proxy that sets `X-Forwarded-For` (overwriting, not appending — it feeds rate limiting).
3. **Google Cloud Console** → Credentials → the Web client → _Authorized JavaScript origins_: add `https://app.<domain>` (and `http://localhost:3000`). No redirect URIs.
4. **Backend CORS** (`api.axioware.tech`, nginx/FastAPI): allow origin `https://app.<domain>` for `POST /v1/scans` with headers `authorization, content-type`. During development I confirmed with a preflight request that it already reflects any origin (so it works today) — but restrict it to an allow-list. Also keep `Authorization` exposed for the preflight.
5. **Apple (optional):** see [auth.md](./auth.md#sign-in-with-apple-stubbed) — Services ID, domain verification, backend audience change.
6. **Smoke test the deployment** (see checklist).

## HTTPS / headers

The app sets a nonce-based CSP (middleware) and HSTS (`max-age=63072000; includeSubDomains`, production only). It does **not** send the `preload` token: submit to the HSTS preload list only when every subdomain is permanently HTTPS.
If you add a new third-party script, frame, image host or API origin, update `src/lib/csp.ts` (there's a test for it) — otherwise the browser will block it. The e2e suite fails on any CSP violation or Chrome CSP issue.

## CI

```
npm ci
npm run typecheck && npm run lint && npm test
npm run build
npm run test:e2e        # builds + starts the app and the mock backend; set PW_CHANNEL=chrome to use system Chrome
```

Playwright needs a browser: `npx playwright install chromium` on CI, or `PW_CHANNEL=chrome`. Use the `CI` env var so servers aren't reused. E2E talks only to `e2e/mock-backend.mjs`, never to production.

## Post-deploy checklist

- [ ] `/sign-in` loads; no CSP errors in the browser console.
- [ ] Sign up with a real email → OTP → lands on the terms gate → app.
- [ ] Google sign-in works from `https://app.<domain>` (origin registered?).
- [ ] Upload a small and a ~100 MB file: progress bar moves, scan completes (CORS + body size).
- [ ] Result page, PDF download, history, profile edit.
- [ ] Sign-out then reload: protected routes redirect to `/sign-in`.
- [ ] `/privacy`, `/support`, `/delete-account` open **without** a session (Play Store data-deletion URL).
- [ ] Response headers on `/` include `Content-Security-Policy` (with nonce), `Strict-Transport-Security`, `X-Content-Type-Options`.

## Known gaps before a public launch

- No crash / error reporting or analytics on web (mobile has both). Errors are intentionally not logged client-side.
- Rate limiting and refresh single-flight are per-instance.
- Terms of Service text speaks only of the “mobile application” and is dated before the privacy policy; Cookie Policy is a placeholder — needs legal review (no wording was invented here).
- Billing, Apple sign-in and delete-scan are unbuilt (see their docs).
