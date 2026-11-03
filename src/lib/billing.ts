/**
 * Billing is NOT wired on mobile or backend yet. Upgrade buttons show a "coming soon" state, never a fake success.
 * The proposed design (Stripe Checkout + Customer Portal, backend-owned entitlements) is in docs/billing.md.
 */
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

export const SUPPORT_EMAIL = 'thefivedot@gmail.com'; // same address used across mobile + legal pages

/** TODO(billing): POST a checkout-session request to the backend and redirect to the returned Stripe URL. The endpoint does not exist yet. */
export async function startCheckout(): Promise<never> {
  throw new Error('Billing is not connected yet.');
}
