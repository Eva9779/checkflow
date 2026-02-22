import Stripe from 'stripe';

/**
 * Stripe server-side SDK initialization.
 * Using a stable API version to ensure compatibility across production environments.
 * CRITICAL: The secret key is strictly pulled from environment variables to prevent GitHub blocks.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27',
});
