'use server';

import { stripe } from '@/lib/stripe';

interface PayoutOptions {
  amount: number;
  currency: string;
  description: string;
}

/**
 * Initiates a real-world ACH payout via Stripe.
 * This sends funds from your Stripe balance to your primary verified bank account.
 */
export async function initiateStripeACHPayout(options: PayoutOptions) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return { 
        success: false, 
        error: "Stripe Secret Key missing in environment variables." 
      };
    }

    const isLive = secretKey.startsWith('sk_live_');
    const amountInCents = Math.round(options.amount * 100);

    // In Stripe, a payout moves funds from your Stripe balance to your own bank account.
    // For third-party transfers, Stripe Connect is required.
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: options.currency.toLowerCase(),
      statement_descriptor: options.description.substring(0, 22) || 'E-CHECK PAYOUT',
      method: 'standard',
    });

    return { 
      success: true, 
      message: isLive ? "Live Payout Authorized" : "Test Payout Authorized", 
      id: payout.id,
      mode: isLive ? 'production' : 'development'
    };
  } catch (error: any) {
    console.error('[STRIPE_PAYOUT_ERROR]', error);
    return { 
      success: false, 
      error: error.message || "The Stripe payout could not be authorized. Ensure your account has sufficient balance."
    };
  }
}
