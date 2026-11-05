# Billing (proposal — not implemented)

**Status:** neither mobile nor the backend has a purchase flow. The web app's Upgrade / Start-trial buttons open a
“Payments coming soon” dialog and never fake a success. `NEXT_PUBLIC_BILLING_ENABLED` is `false`; `src/lib/billing.ts` contains
one clearly named stub, `startCheckout()`, to replace when the backend exists.

Plans today (from the live `GET /plans`): **Free** $0 / 20 analyses · **Pro** $9/month, 7-day trial, 500 analyses · **Team** $24/month (contact sales in-app).

## Design

1. **Stripe Checkout (hosted)** for Pro (and Team if self-serve) + **Stripe Customer Portal** for manage / cancel / update card.
2. **The backend owns entitlements.** A Stripe webhook updates `user.plan` (and limits/reset date). The web app only _reads_ `user.plan` and `/plans`, so a plan bought on web shows up on mobile automatically.
3. The web app never handles card data and needs **no CSP change** (Checkout and the Portal are full-page redirects).

### Why not the `POST /subscriptions` + `paymentMethodId` design in `BACKEND_SPEC.md`

It requires collecting cards on our pages with Stripe.js/Elements (larger PCI scope, new script/frame CSP entries, SCA/3-D Secure handling by us). Hosted Checkout avoids all of that and handles tax, SCA, trials and receipts. Recommend dropping `POST/DELETE /subscriptions`.

## Backend work required (all new; names are proposals)

### 1. `POST /v1/billing/checkout-session` (auth: Bearer)

Request: `{ "planId": "pro" | "team", "successUrl": string, "cancelUrl": string }`
Response: `{ "url": string }` (Stripe Checkout URL).
Server must:

- Create or reuse a Stripe Customer for the user (store `stripeCustomerId` on the user).
- Create a Checkout Session in `subscription` mode with the Price for `planId`, `client_reference_id = user.id`, `metadata.userId`, `subscription_data.trial_period_days = 7` for Pro **only if the user has never had a trial**, `allow_promotion_codes` if wanted, optionally Stripe Tax.
- **Validate `successUrl`/`cancelUrl` against an allow-list of the app's origins** (open-redirect protection).
- Refuse if the user already has an active subscription (send them to the portal) — including one bought through Apple/Google (see below).

### 2. `POST /v1/billing/portal-session` (auth: Bearer)

Request: `{ "returnUrl": string }` → Response: `{ "url": string }` (Stripe Billing Portal). Same URL allow-list. 404/409 if the user has no Stripe customer.

### 3. `POST /v1/billing/webhook` (public; Stripe-signed)

- Verify the `Stripe-Signature` header with the endpoint secret; reject otherwise. Never trust the body without it.
- **Idempotent** by `event.id` (Stripe retries); handle out-of-order delivery by reading the subscription's current state rather than trusting event order.
- Handle at least:
  - `checkout.session.completed` — link `stripeCustomerId`/`subscriptionId` to the user via `client_reference_id`.
  - `customer.subscription.created|updated|deleted` — set `user.plan` from the price, `planResetDate` from the period, `scansLimitThisMonth` from the plan; downgrade to `free` on `deleted` / end of period.
  - `invoice.payment_failed` — mark `past_due`; decide grace-period behaviour.
  - `invoice.paid` — clear `past_due`.
  - optionally `customer.subscription.trial_will_end` — to trigger a notification (the app already has `plan_upgraded` / `usage_warning` templates).

### 4. Extend `GET /v1/users/me` (additive, optional fields)

```json
"subscription": {
  "status": "trialing | active | past_due | canceled | none",
  "provider": "stripe | apple | google | none",
  "cancelAtPeriodEnd": false,
  "currentPeriodEnd": "ISO-8601",
  "trialEndsAt": "ISO-8601 | null"
}
```

Existing clients ignore unknown fields; `plan` stays the source of truth for gating.

### 5. Config

Stripe secret key, webhook secret, Price IDs per plan, allowed redirect origins — backend env only. **None of these go in this repo.**

## Web work once the backend exists (small)

- Replace `startCheckout()`: `POST /api/proxy/billing/checkout-session` (add `billing` to the proxy allow-list), then `window.location.assign(url)`.
- Add “Manage billing” (portal) on Profile / Plans for paid users.
- On return (`?checkout=success`) poll `GET /users/me` briefly until `plan` changes — the webhook can lag the redirect by a few seconds. Show a neutral “Finishing up…” state, never assume success from the URL alone.
- Show trial end date / `cancelAtPeriodEnd` from `subscription`.
- Flip `NEXT_PUBLIC_BILLING_ENABLED=true`.

## Apple / Google policy considerations (verify before launch)

I can't check current policy text from this environment and these rules have been changing (including US court-driven changes in 2025). Treat the below as a checklist for you / counsel, not as legal advice.

- **Apple (App Store Review Guidelines 3.1.1 / 3.1.3):** digital features/subscriptions unlocked inside an iOS app generally must be sold through In-App Purchase. Guideline 3.1.3(b) “Multiplatform Services” lets an app give access to things bought on another platform/website **provided the same items are also available as In-App Purchase in the app**. So “buy Pro on the web, use it in the iOS app” is safest _only if the iOS app also sells Pro via IAP_. Separately, **steering** (buttons/links in the iOS app that point to web purchase) is restricted outside specific programs/regions — don't add in-app “buy on our website” links without confirming current rules.
- **Google Play (Payments policy):** apps distributed on Play that sell digital goods must use Google Play Billing unless a program/exception applies; steering users to outside payment from within the app is similarly restricted unless enrolled in an applicable program.
- **Practical safe path:** web checkout + mobile app that _only reads_ entitlement and shows no purchase link, **or** add IAP/Play Billing on mobile and treat all three providers as entitlement sources.
- **Backend consequence either way:** model entitlement as `{ provider, status, currentPeriodEnd }` so a user can't end up double-subscribed (Stripe + Apple), and so cancel/refund UI points to the right provider. `GET /users/me.subscription.provider` (above) supports that; the web Portal button must only appear when `provider === "stripe"`.
- Web-only consumer-protection items: clear trial terms and price before checkout (Stripe Checkout shows these), easy cancellation (the Portal), tax handling (Stripe Tax), refund policy text.

## Testing checklist for the backend dev

Stripe CLI `stripe listen --forward-to localhost:8000/v1/billing/webhook` + test clocks for trial end/renewal; test-mode cards `4242…` (success), `4000 0000 0000 0341` (attach then decline), and an SCA card; replay each webhook twice (idempotency); deliver `subscription.deleted` before `updated` (ordering).
