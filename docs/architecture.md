# Architecture

The 5dot web app is the browser version of the Expo mobile app. It talks to the **same FastAPI backend** and uses the **same
user accounts**. The marketing site (`../5dot_web`) is a separate project.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · TanStack Query · React Hook Form + Zod ·
lucide-react · Vitest + Testing Library · Playwright (+ axe). No component library: small primitives in `src/components/ui`.

## Request flow

```
Browser ──(same-origin, cookies)──►  Next.js BFF  ──(Bearer JWT)──►  FastAPI  (https://api.axioware.tech/v1)
   │         /api/auth/*  /api/proxy/*                                    ▲
   │                                                                      │
   └── large file upload ───────────────(Bearer, CORS)────────────────────┘   (direct; see "Uploads")
```

- **Browser JS never holds the refresh token or (except for uploads) the access token.** Both live in httpOnly cookies.
- `/api/auth/*` handles sign-in/up/OAuth: validates input (Zod), calls the backend, stores tokens in cookies, returns only `{ user }`.
- `/api/proxy/[...path]` forwards an allowlist of backend areas (`scans users stats plans feedback notifications`), attaches
  `Authorization`, refreshes once on 401 (single-flight) and retries. Details: [auth.md](./auth.md).
- Middleware (`src/middleware.ts`) redirects signed-out users from app routes, signed-in users away from auth pages, and sets the
  per-request CSP nonce.

## Layout

```
src/
  app/
    (auth)/   sign-in, sign-up, verify, forgot-password, reset-password, terms (gate)
    (app)/    /, scan, scan/[id], history (“Dashboard”), plans, usage, profile, notifications, feedback, help, about, account, account/delete
    api/      auth/[action], proxy/[...path]
    legal/[doc]  terms, cookies (text from the mobile bundle); privacy|support|delete-account are route handlers serving legal HTML
    dev/ui    kitchen-sink (404 in production)
  components/ ui/ (Button Input Card Modal Toast Tabs) · scan/ (VerdictRing ScoreTimeline ScanListItem) · shell/ · plans/ · auth/
  lib/        api/ (client, errors, Zod schemas) · auth/ · scan/ (verdict logic, hooks, upload) · csp.ts
  server/     auth-handler, proxy-handler, refresh, session, guards (CSRF + rate limit), upload-token, legal
  styles/     tokens.ts + globals.css (@theme)
content/legal/  verbatim copies of faikNew/legal/*.html
e2e/            Playwright specs + in-memory mock backend
```

## Server state

TanStack Query only. Keys: `['me']`, `['scan', id]`, `['history']`, `['stats','weekly']`, `['plans']`, `['notifications']`.
Scan polling is `refetchInterval` on `['scan', id]`: 1.5 s (as mobile), backing off to 5 s after ~15 s, stopping on a terminal state
or a definitive 4xx. A scan is “done” when `status` is terminal **or every requested detection has settled** (the top-level
status can lag on the real backend, same rule as mobile).

## Uploads

Serverless hosts cap request bodies at a few MB; the app allows 125 MB. So by default the browser uploads **directly** to the
backend via XHR (for progress) using the access token from `POST /api/auth/upload-token`. I verified against the real API that
its CORS preflight allows `localhost:3000` and `app.5dot.app` with the `authorization` header. This is the single place JS sees a
token. `NEXT_PUBLIC_UPLOAD_MODE=proxy` streams through the BFF instead (self-hosted Node only). URL scans are small and always use the proxy.

## Verdict logic

Ported verbatim from mobile (`src/lib/scan/verdicts.ts`, `summary.ts`): a score is judged against **its own threshold**;
within ±0.10 is a “close call”; the headline is the check furthest past its own threshold. Same input ⇒ same verdict on web and mobile.
The margin is computed once by `marginOf()` (rounded to 9 decimals) and shared by the level and the headline ranking, so a score exactly ±0.10 from its threshold lands in the right level (plain subtraction gives `0.6 − 0.5 = 0.0999…`). The same fix is in mobile (`src/constants/verdicts.ts`, `src/utils/scanSummary.ts`); a regression test sweeps every threshold 0.00–1.00.

## Design system

Tokens in `src/styles/tokens.ts` and the `@theme` block in `globals.css` mirror mobile (`colors.ts`, `spacing.ts`, `typography.ts`):
brand rose `#C0376B`, verdict colours, `#F2F2F7` background, same radii and type scale, system font (as mobile), light only (as mobile).

Deliberate deviations (all for WCAG AA, all commented in the code):

| Token                 | Mobile       | Web                      | Why                                                                   |
| --------------------- | ------------ | ------------------------ | --------------------------------------------------------------------- |
| Green button          | `#84CC16`    | `#3F7D0B`                | white text on `#84CC16` is ~1.9:1                                     |
| Secondary text        | `#6B7280`    | `#5F6673`                | ~4.4:1 on `#F2F2F7`, below 4.5:1                                      |
| Verdict text on white | ring colours | darker `TONE_TEXT_COLOR` | small coloured text needs ≥4.5:1; rings/fills keep the mobile colours |

## Mobile → web parity

| Mobile                                                                                                          | Web                                                                                                     | Notes                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| SignIn / SignUp / VerifySignUp / ResetPassword                                                                  | `/sign-in` `/sign-up` `/verify` `/forgot-password` `/reset-password`                                    | OTP flow, Google, Apple (env-gated)                                                   |
| TermsGate                                                                                                       | `/terms`                                                                                                | per-user local flag, as mobile                                                        |
| Home                                                                                                            | `/`                                                                                                     | trending shown only if the API returns items (mobile also has bundled fallback clips) |
| ScanUpload + Analyzing + Result                                                                                 | `/scan`, `/scan/[id]`                                                                                   | one state-driven route                                                                |
| History (“Dashboard”)                                                                                           | `/history`                                                                                              |                                                                                       |
| Plans / UsageStats / Profile / Notifications / Feedback / HelpSupport / About / PrivacySecurity                 | `/plans` `/usage` `/profile` `/notifications` `/feedback` `/help` `/about` `/account` `/account/delete` |                                                                                       |
| LegalDocument                                                                                                   | `/legal/terms`, `/legal/cookies`, `/privacy`                                                            | privacy from the newer HTML                                                           |
| OfflineBanner, ErrorModal, ErrorBoundary, PatternBackground, VerdictRing, ScoreTimeline, ScanListItem, PlanCard | ported                                                                                                  |                                                                                       |

### Intentionally not ported

- **EvidenceCard, WaveformPlayer** — unused by any mobile screen.
- **OnboardingScreen** — not in the web brief; sign-in is the entry point.
- **Force-update, push tokens, analytics, crash reporting** — mobile-only or no web equivalent yet.
- **About benchmark stats / changelog / social links, “Change password”, privacy switches** — unverified or non-functional on mobile.
- **Delete scan** — mobile has no such call and the real endpoint is unconfirmed (`BACKEND_SPEC.md` lists `DELETE /scans/{id}`).

## Where the mobile code and `BACKEND_SPEC.md` disagree (mobile wins)

Base URL (`api.axioware.tech/v1`); one `POST /scans` for files and URLs; polling `GET /scans/{id}` (no `/status`, no WebSocket);
per-detection `{score, threshold}` results instead of `resultType`; `GET /scans/history?limit&offset`; PDF at
`GET /scans/{id}/report.pdf`; extra endpoints `/users/me/deactivate`, `/notifications`, `/scans/trending`.

## Testing

- **Vitest (125 tests):** error parser, refresh single-flight, auth/proxy BFF, CSRF, rate limits, CSP builder, middleware, verdict logic, forms, UI components, legal content fidelity.
- **Playwright (8 tests, production build + mock backend):** full flow, token secrecy, 404, WCAG 2.1 AA via axe on 18 pages, keyboard skip link, no CSP issues.
- `e2e/mock-backend.mjs` stands in for the API (shapes from the mobile service code). It is _not_ the real backend: nothing here has run against `api.axioware.tech` beyond a CORS preflight and `GET /plans`.
