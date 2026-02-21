import Stripe from 'stripe';

/**
 * Stripe server-side SDK initialization.
 * For live ACH payouts, the STRIPE_SECRET_KEY is read from environment variables.
 * Ensure your Stripe account has ACH Payouts or Treasury enabled for production use.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27-preview.acacia' as any,
});
