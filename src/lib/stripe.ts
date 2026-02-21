import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  // We use a dummy key for initialization if none is provided
  // In a real environment, you must set STRIPE_SECRET_KEY in .env
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
  apiVersion: '2025-01-27-preview.acacia' as any,
});
