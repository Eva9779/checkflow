import Stripe from 'stripe';

/**
 * Stripe server-side SDK initialization.
 * For live ACH payouts, the STRIPE_SECRET_KEY must be set in your .env file.
 * Ensure your Stripe account has ACH Payouts or Treasury enabled for production use.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
  apiVersion: '2025-01-27-preview.acacia' as any,
});
