# Deploying to AWS (runbook)

This is a step-by-step guide for **you** to follow in the client's AWS account. Nothing in this repo deploys automatically.
Placeholders: `<domain>` (e.g. `example.com`), `<account-id>`, `<region>` = **`ap-southeast-1`** (Singapore, where `api.axioware.tech` already runs).
Console labels change slightly over time; the concepts and values are what matter.

```
Route 53 (<domain>)
 ├─ <domain>, www.<domain> → CloudFront "site" → S3 (private bucket)                    5dot_web   (static files)
 └─ app.<domain>           → CloudFront "app"  → ALB → ECS Fargate, 1 task, Singapore   5dot_webApp (Node server)
 api.axioware.tech (existing EC2, Singapore) — unchanged
```

Approximate monthly cost (check the AWS Pricing Calculator): site ≈ $1–3 · app ≈ $35–50 (ALB ≈ $20, Fargate 0.5 vCPU/1 GB ≈ $18, rest a few dollars).

## Domains for this project

- **Primary: `5dotai.com`**: marketing site at the apex, web app at `app.5dotai.com`.
- **Secondary: `fivedotai.com`**: it and every `www.` host answer with a **301 redirect to `https://5dotai.com`** (one CloudFront Function, section 2.3), so there is a single canonical site for SEO, QR codes and links.
- Both are registered at **GoDaddy**. Only DNS moves to Route 53; the registration (and renewal) stays at GoDaddy, so keep auto-renew on.
- Wherever this runbook says `<domain>`, use `5dotai.com`.

## Why this shape

- **5dot_web is plain static files** (verified: `next build` with `output: 'export'` produces ~4.6 MB). No server needed → S3 + CloudFront.
- **5dot_webApp needs a Node server** (middleware, `/api/auth/*`, `/api/proxy/*`, per-request CSP nonce) → container on Fargate.
- **Run exactly one task, not serverless.** The BFF de-duplicates token refreshes in memory. On Lambda-style hosting, parallel requests hit different instances, each refreshes the same refresh token, and (if the backend invalidates used refresh tokens) the loser clears the winner's new cookies, signing the user out. One long-running task avoids this. Rate limiting is also exact on one task.
- Don't run the web app on the API's EC2 box: shared failure and a bigger blast radius.

---

## 0. Before you start

1. **Access to the client's account:** ask for an IAM Identity Center user (or IAM user) with admin rights and **MFA**, not the root user. Never share long-lived access keys in chat.
2. **Billing guardrail:** Billing → Budgets → create a monthly cost budget (e.g. $60) with email alerts.
3. **Tools on your machine:** AWS CLI v2 (`aws configure sso` or `aws configure`), Docker, Node 22.
4. **Decide the names** and write them down: the domain, `app.<domain>`, `origin.<domain>` (internal name for the load balancer).
5. **Marketing site URL:** `5dot_web` bakes `NEXT_PUBLIC_SITE_URL` into canonical tags, the sitemap, robots and QR codes **at build time**. The code default is now `https://5dotai.com`, but pass it explicitly when you build (step 2.1) so a typo can't ship the wrong domain.

## 1. DNS and certificates (GoDaddy → Route 53)

I checked both domains: they use GoDaddy's nameservers, point at a parking page, and have **no MX (email), TXT, CAA or DNSSEC records**, so nothing needs preserving and nothing blocks certificate issuance.

1. **Route 53 → Hosted zones → Create hosted zone**: `5dotai.com`, type _Public_. Repeat for `fivedotai.com`. Each zone shows **4 `NS` values** (different for each zone). Use Route 53 for DNS because the bare domain needs an _alias_ record to CloudFront, which GoDaddy can't do.
2. **GoDaddy → My Products → the domain → DNS → Nameservers → Change Nameservers → "I'll use my own nameservers"**: enter that zone's 4 values (without the trailing dot) → Save. Do it for each domain with **its own** zone's values. Check progress with `dig +short NS 5dotai.com` (should show `awsdns` names; usually minutes, can take up to 48 h). The parking page stops working at this point, which is fine.
3. **Wait for step 2 to propagate**, then **ACM in `us-east-1` (N. Virginia)**, required for CloudFront: _Request a public certificate_ with names `5dotai.com`, `www.5dotai.com`, `app.5dotai.com`, `fivedotai.com`, `www.fivedotai.com`. Validation = DNS → **Create records in Route 53** (works for both zones). Wait for _Issued_.
4. _(Later, for the web app)_ **ACM in `ap-southeast-1`**: names `app.5dotai.com` **and** `origin.5dotai.com`, DNS validation the same way.

## 2. Marketing site (`5dot_web`) → S3 + CloudFront

### 2.1 Build the static files

```bash
cd 5dot_web
NEXT_PUBLIC_SITE_URL=https://<domain> npm ci && NEXT_PUBLIC_SITE_URL=https://<domain> npm run build   # writes ./out
# add the other NEXT_PUBLIC_* from .env.example here too (store URLs, analytics IDs…), they are baked in at build
```

`out/` holds `index.html`, `terms.html`, `download.html`, `light.html`, `404.html`, `privacy-policy.html`, `support.html`, `delete-account.html`, `_next/`, `qr/`, `sitemap.xml`, `robots.txt`, images. Preview locally with `npx serve out`.

### 2.2 S3 bucket

S3 → Create bucket: name `5dot-site-<account-id>`, region `ap-southeast-1`, **Block all public access = ON**, ACLs disabled, default encryption on. No static-website hosting.

### 2.3 CloudFront function (clean URLs + redirect to the primary domain)

CloudFront → Functions → Create function `site-rewrite` (runtime 2.0) → paste → **Publish**:

```js
var PRIMARY = '5dotai.com';

function handler(event) {
  var req = event.request;
  var host = req.headers.host.value.toLowerCase();

  // fivedotai.com, www.5dotai.com, www.fivedotai.com ... -> https://5dotai.com (same path + query)
  if (host !== PRIMARY) {
    var qs = Object.keys(req.querystring)
      .map(function (k) {
        var v = req.querystring[k];
        return v.value === '' ? k : k + '=' + v.value;
      })
      .join('&');
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://' + PRIMARY + req.uri + (qs ? '?' + qs : '') } },
    };
  }

  var uri = req.uri;
  if (uri.charAt(uri.length - 1) === '/')
    req.uri = uri + 'index.html'; // "/"      -> /index.html
  else if (uri.indexOf('.') === -1) req.uri = uri + '.html'; // "/terms" -> /terms.html
  return req;
}
```

### 2.4 CloudFront distribution "site"

- **Origin:** the S3 bucket (REST endpoint, not the website endpoint). _Origin access_ = **Origin access control (OAC)** → create new, sign requests. After creating, CloudFront shows a bucket policy: **copy it into the bucket's Permissions → Bucket policy**.
- **Default behavior:** Viewer protocol = _Redirect HTTP to HTTPS_; allowed methods GET/HEAD; **Cache policy = CachingOptimized**; Compress = on; **Response headers policy = SecurityHeadersPolicy** (managed; adds HSTS, nosniff, frame and referrer headers); **Function associations → Viewer request = `site-rewrite`**.
- **Settings:** alternate domain names **`5dotai.com`, `www.5dotai.com`, `fivedotai.com`, `www.fivedotai.com`**; custom SSL certificate = the `us-east-1` one; security policy TLSv1.2_2021; HTTP/2 and HTTP/3 on; default root object `index.html`.
- **Error pages:** add custom error responses for **403** and **404** → response page path `/404.html`, HTTP response code **404** (S3 returns 403 for missing keys when access is via OAC).

### 2.5 Upload (and every future release)

```bash
BUCKET=5dot-site-<account-id>
# everything except hashed assets: short cache
aws s3 sync out "s3://$BUCKET" --delete --exclude "_next/static/*" --cache-control "public, max-age=300"
# hashed build assets: cache forever
aws s3 sync out/_next/static "s3://$BUCKET/_next/static" --cache-control "public, max-age=31536000, immutable"
aws cloudfront create-invalidation --distribution-id <SITE_DISTRIBUTION_ID> --paths "/*"
```

### 2.6 DNS records

In **each** hosted zone (`5dotai.com` and `fivedotai.com`) create **A (Alias)** records for the bare domain **and** for `www`, with _Alias to CloudFront distribution_ → "site" (pick the distribution from the dropdown). Add matching **AAAA** aliases too if IPv6 is enabled on the distribution. The function redirects everything except `https://5dotai.com` to it.

---

## 3. Web app (`5dot_webApp`) → ECS Fargate

### 3.1 Build and push the image

```bash
cd 5dot_webApp
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.axioware.tech/v1 \
  --build-arg NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the web client id from .env.example> \
  --build-arg NEXT_PUBLIC_APP_ORIGIN=https://app.<domain> \
  -t 5dot-webapp:$(git rev-parse --short HEAD) .
```

`NEXT_PUBLIC_APP_ORIGIN` must be **exactly** the public URL (scheme + host, no trailing slash): it is what the CSRF check trusts. The build fails fast if the first and third args are missing. Image size ≈ 250 MB.

Create the registry and push (ECR → Create repository `5dot-webapp`, private, region `ap-southeast-1`):

```bash
REG=<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $REG
TAG=$(git rev-parse --short HEAD)
docker tag 5dot-webapp:$TAG $REG/5dot-webapp:$TAG
docker push $REG/5dot-webapp:$TAG
```

Use a unique tag per release (the git SHA), not `latest`: it makes rollback a one-click change.

### 3.2 Network and security groups (use the default VPC)

- Use the default VPC's **public subnets in at least two AZs**. Tasks get a public IP so they can reach ECR, CloudWatch and `api.axioware.tech` **without a NAT gateway** (a NAT would add ≈ $35+/month). Isolation comes from the security group, not the subnet.
- **`alb-sg`:** inbound **HTTPS 443** from the managed prefix list **`com.amazonaws.global.cloudfront.origin-facing`** only. _Gotcha:_ that list counts as ~55 rules against the default 60-rules-per-SG limit; if AWS refuses, request a quota increase or temporarily allow 443 from anywhere and rely on the secret header in 3.3 (still safe, just less layered).
- **`task-sg`:** inbound **TCP 3000** from `alb-sg` only. Outbound: allow all.

### 3.3 Application Load Balancer

1. **Target group:** type _IP addresses_, protocol HTTP, port **3000**, VPC default. Health check path **`/api/health`**, success code 200, interval 30 s, healthy threshold 2. Deregistration delay 30 s.
2. **Create ALB:** internet-facing, IPv4, the 2+ public subnets, security group `alb-sg`.
3. **Listener HTTPS:443:** certificate = the **`ap-southeast-1`** one; policy `ELBSecurityPolicy-TLS13-1-2-2021-06`. **Default action = Return fixed response** `403`, `text/plain`, body `Forbidden`.
4. **Listener rule** (priority 1): condition **HTTP header** `X-Origin-Verify` = _a random secret_ (generate with `openssl rand -hex 32` and keep it) → action _Forward_ to the target group. This makes the ALB useless to anyone who finds its address; only your CloudFront knows the header.
5. Route 53: **A (Alias)** `origin.<domain>` → this ALB.

### 3.4 ECS

1. **CloudWatch Logs:** create log group `/ecs/5dot-webapp`, retention 30 days.
2. **ECS → Clusters → Create** `5dot` (Fargate only).
3. **Task definition** `5dot-webapp`: Fargate, Linux/**X86_64**, **0.5 vCPU / 1 GB**, task execution role `ecsTaskExecutionRole` (create if missing; it pulls from ECR and writes logs). No task role needed (the app makes no AWS calls). Container:
   - image `<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/5dot-webapp:<tag>`, port **3000**, essential
   - environment: **`TRUSTED_PROXY_HOPS` = `2`** (CloudFront + ALB — see "Client IP" below). Optionally `API_BASE_URL` if the server should reach the API on a different URL than browsers do. No secrets are needed.
   - logs: `awslogs`, group `/ecs/5dot-webapp`, region `ap-southeast-1`, prefix `app`.
4. **Service** `5dot-webapp` in cluster `5dot`: Fargate, **desired tasks = 1**, deployment type _Rolling_, **minimum healthy 100% / maximum 200%**, **enable the deployment circuit breaker with rollback**, subnets = the same public ones, security group `task-sg`, **public IP = ENABLED**, load balancing = the ALB / target group above (container `5dot-webapp:3000`), health check grace period 60 s.
   During a release two tasks briefly overlap; a user could be signed out once in that window only if the backend invalidates used refresh tokens. Acceptable; schedule releases off-peak.

### 3.5 CloudFront distribution "app"

- **Origin:** domain `origin.<domain>`, protocol **HTTPS only**, port 443, min TLS 1.2. **Add custom header** `X-Origin-Verify` = the same secret as 3.3. Origin response timeout 60 s.
- **Default behavior (`*`):** viewer protocol _Redirect HTTP to HTTPS_; **allowed methods = all seven** (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE: the BFF uses PATCH/DELETE/POST); **cache policy = CachingDisabled**; **origin request policy = AllViewer** (forwards Host, cookies, query, headers; the app needs cookies and `Origin`); compress on. Do **not** add a response headers policy: the app sets its own CSP, HSTS and friends.
- **Second behavior** path `/_next/static/*`: methods GET/HEAD, cache policy **CachingOptimized**, no origin request policy (fingerprinted files, safe to cache for a year).
- **Settings:** alternate domain `app.<domain>`; custom certificate = the `us-east-1` one; TLSv1.2_2021.
- Route 53: **A (Alias)** `app.<domain>` → this distribution.
- _Recommended:_ attach **AWS WAF** with a rate-based rule on `/api/auth/*` (e.g. 100 requests / 5 min / IP). It protects the sign-in endpoints at the edge across any number of tasks (≈ $6–10/month).

### Client IP and `TRUSTED_PROXY_HOPS`

The app rate-limits by client IP read from `X-Forwarded-For`, counting `TRUSTED_PROXY_HOPS` entries from the **end** (entries on the left can be forged by the caller). CloudFront + ALB = **2**. If you later remove CloudFront, set **1**; Vercel-style single proxy = 1. A wrong value makes limits too weak or lumps everyone together (everybody gets 429s). Verified in a container: forging `X-Forwarded-For` does not evade the limit.

---

## 4. Connect the pieces

1. **Google Cloud Console** → APIs & Services → Credentials → the Web OAuth client → **Authorized JavaScript origins**: add `https://app.<domain>` (keep `http://localhost:3000` for dev). Wait a few minutes.
2. **Backend CORS** (nginx/FastAPI on the EC2 box): allow origin `https://app.<domain>` for `POST /v1/scans` with headers `authorization, content-type`. Today it reflects any origin (so it works), but make it an allow-list.
3. **Apple sign-in:** optional, see [auth.md](./auth.md).

## 5. Smoke test (do all of these)

- [ ] `https://5dotai.com` loads; `https://www.5dotai.com`, `https://fivedotai.com` and `https://www.fivedotai.com` each 301-redirect to it (check with `curl -I`); `/terms`, `/download` work; `/privacy-policy.html`, `/support.html`, `/delete-account.html` open.
- [ ] `https://<domain>/sitemap.xml` and `/robots.txt` contain `https://5dotai.com`.
- [ ] `https://app.<domain>/api/health` → `{"status":"ok"}`; `http://app.<domain>` redirects to https.
- [ ] `https://app.<domain>/sign-in`: no errors in the browser console; the Google button renders.
- [ ] Sign up with a real email → OTP → terms → home. Sign out and in again.
- [ ] Upload a small and a ~100 MB video: the progress bar moves and the result appears (this proves CORS + direct upload).
- [ ] `https://app.<domain>/privacy`, `/support`, `/delete-account` open without signing in.
- [ ] Response headers on `https://app.<domain>/` include `Content-Security-Policy` (with a nonce that changes per request), `Strict-Transport-Security`.
- [ ] `curl -i https://origin.<domain>/api/health` (without the secret header) → **403**.

## 6. Releasing and rolling back

- **Marketing:** rebuild (2.1), sync + invalidate (2.5).
- **App:** build + push a new tag (3.1) → ECS → Task definitions → _Create new revision_ → change the image tag → _Update service_ with that revision. ECS rolls out and **rolls back automatically** if the new task never becomes healthy. **Manual rollback:** update the service to the previous task-definition revision.
- Keep `NEXT_PUBLIC_*` values identical between releases unless you intend to change them (they're baked into the image).

## 7. Monitoring

- CloudWatch alarms (email via SNS): ALB `HTTPCode_Target_5XX_Count` > 5/5 min, target group `UnHealthyHostCount` ≥ 1, ECS service CPU > 80% and memory > 85%.
- Logs: CloudWatch Logs `/ecs/5dot-webapp` (the app never logs tokens, bodies or personal data). There is **no** error-reporting service yet.
- Optional: Route 53 health check on `https://app.<domain>/api/health` with an alarm.

## 8. Troubleshooting

| Symptom                                           | Likely cause                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| CloudFront 502/504 on `app.`                      | ALB cert doesn't cover `app.<domain>`/`origin.<domain>`; `alb-sg` blocks CloudFront; no healthy targets (check ECS service events) |
| `403 Forbidden` plain text                        | `X-Origin-Verify` header on the CloudFront origin ≠ the ALB rule value                                                             |
| Targets unhealthy                                 | `task-sg` doesn't allow 3000 from `alb-sg`; no public IP / no route to ECR; wrong health path (must be `/api/health`)              |
| Page loads but is blank, console shows CSP errors | `NEXT_PUBLIC_API_BASE_URL` build arg wrong/missing (the CSP's `connect-src` is built from it)                                      |
| Sign-in works then bounces to sign-in             | cookies not stored: not on HTTPS, or CloudFront not forwarding cookies (origin request policy must be AllViewer)                   |
| Every POST returns 403 `CSRF_BLOCKED`             | `NEXT_PUBLIC_APP_ORIGIN` ≠ the public origin exactly (scheme/host/no slash) → rebuild the image                                    |
| Everyone gets 429 on sign-in                      | `TRUSTED_PROXY_HOPS` too large/small for the proxy chain                                                                           |
| Google button: "origin not allowed"               | the app origin isn't in the OAuth client's Authorized JavaScript origins yet                                                       |
| Upload fails with a CORS error                    | backend CORS doesn't allow `https://app.<domain>` for `POST /v1/scans`                                                             |
| Marketing page 404 for `/terms`                   | the CloudFront function isn't attached to the _viewer request_ event of the site distribution                                      |

## Environment variables

`NEXT_PUBLIC_*` are **inlined at build time**: for Docker they're build args; changing one means rebuilding the image.

| Variable                                                          | When                          | Notes                                                                             |
| ----------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`                                        | build, **required**           | `https://api.axioware.tech/v1`. Also feeds the CSP `connect-src` (direct uploads) |
| `NEXT_PUBLIC_APP_ORIGIN`                                          | build, **required**           | exactly `https://app.<domain>`; trusted by the CSRF check                         |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`                                | build                         | must equal the backend's `GOOGLE_WEB_CLIENT_ID`                                   |
| `NEXT_PUBLIC_APPLE_SERVICES_ID`, `NEXT_PUBLIC_APPLE_REDIRECT_URI` | build                         | Apple button hidden unless both set                                               |
| `NEXT_PUBLIC_UPLOAD_MODE`                                         | build                         | `direct` (default; required behind CloudFront for big files)                      |
| `NEXT_PUBLIC_BILLING_ENABLED`                                     | build                         | keep `false` until [billing.md](./billing.md) is built                            |
| `TRUSTED_PROXY_HOPS`                                              | **runtime** (task definition) | `2` behind CloudFront + ALB                                                       |
| `API_BASE_URL`                                                    | runtime, optional             | server-only override of the API URL                                               |

No secrets are needed by this app. Do not copy anything from `faikNew/.env`, credentials, Firebase admin JSON or `google-services.json`.

## Headers and CSP

The app sets a nonce-based CSP (middleware) and HSTS (`max-age=63072000; includeSubDomains`, no `preload`). Add `preload` and submit to the HSTS preload list only when every subdomain is permanently HTTPS. New third-party scripts, frames, image hosts or API origins must be added to `src/lib/csp.ts` (covered by tests); the e2e suite fails on any CSP violation.

## CI (tests only)

```
npm ci && npm run typecheck && npm run lint && npm test
npm run test:e2e        # builds + starts the app and the mock backend; PW_CHANNEL=chrome uses system Chrome
```

E2E talks only to `e2e/mock-backend.mjs`, never to production.

## Known gaps before a public launch

- No crash / error reporting or analytics on web (mobile has both).
- One task = no high availability (an AZ or task failure means a short outage until ECS replaces it). Fine to start; scale-out needs a shared store for the refresh de-dup (see [auth.md](./auth.md)).
- Terms of Service text speaks only of the "mobile application" and is dated before the privacy policy; Cookie Policy is a placeholder (needs legal review).
- Billing, Apple sign-in and delete-scan are unbuilt (see their docs).
