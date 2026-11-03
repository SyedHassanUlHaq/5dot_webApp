# 5dot Web App

The browser version of the 5dot mobile app: detect AI-generated or tampered audio/video. Upload a file or paste a YouTube/X/TikTok link and get a
0–100 verdict with evidence. Same backend and accounts as the mobile app. (The marketing site is a separate project: `../5dot_web`.)

## Quick start

```bash
cp .env.example .env.local      # defaults point at https://api.axioware.tech/v1
npm install
npm run dev                     # http://localhost:3000
```

Developed and tested on Node 22. To try it without the real API: `node e2e/mock-backend.mjs` and set `NEXT_PUBLIC_API_BASE_URL=http://localhost:4010/v1`
(any email and password works except the password `wrong`, which is rejected; OTP codes are `123456`).

## Scripts

|                                         |                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js                                                                                                                                                                         |
| `npm run typecheck` · `lint` · `format` | tsc, ESLint, Prettier                                                                                                                                                           |
| `npm test`                              | Vitest unit/component tests                                                                                                                                                     |
| `npm run test:e2e`                      | Playwright smoke + accessibility tests against a production build and the mock backend. Use `PW_CHANNEL=chrome` to run on system Chrome instead of Playwright's bundled browser |

Stop any other `next dev` in this folder before building: it shares `.next` and will corrupt the build.

## Docs

- [docs/architecture.md](docs/architecture.md): how it fits together, mobile parity, design-token deviations
- [docs/auth.md](docs/auth.md): cookies, refresh, CSRF, Google/Apple setup
- [docs/billing.md](docs/billing.md): proposed Stripe design and backend work (not built)
- [docs/deploy.md](docs/deploy.md): step-by-step AWS runbook (S3 + CloudFront for the marketing site, ECS Fargate for this app), env vars, checklist

## Docker

```bash
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.axioware.tech/v1 \
  --build-arg NEXT_PUBLIC_APP_ORIGIN=https://app.<domain> \
  --build-arg NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id> -t 5dot-webapp .
docker run -p 3000:3000 -e TRUSTED_PROXY_HOPS=1 5dot-webapp
```

`NEXT_PUBLIC_*` are build args (baked into the bundle and CSP). Health check: `GET /api/health`. See [docs/deploy.md](docs/deploy.md).

## Security in one paragraph

Tokens live in httpOnly cookies behind a thin BFF (`/api/auth/*`, `/api/proxy/*`); browser JS never sees the refresh token. Mutating routes check `Origin`,
auth routes are rate-limited, every page has a nonce-based CSP, and nothing logs tokens or personal data. The one exception, a short-lived access token handed to
the browser so large files can upload directly to the backend, is documented in [docs/auth.md](docs/auth.md).
