
'use server';

import { stripe } from '@/lib/stripe';

interface PayoutOptions {
  amount: number;
  currency: string;
  description: string;
}

/**
 * Initiates a real-world ACH payout via Stripe.
 * NOTE: stripe.payouts.create sends funds from your Stripe balance to your 
 * verified business bank account. To send to CLIENTS, ensure you use 
 * Stripe Connect or have their account verified as a payout destination.
 */
export async function initiateStripeACHPayout(options: PayoutOptions) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe Secret Key is missing. Add it to your .env file.");
    }

    const amountInCents = Math.round(options.amount * 100);

    // Create a Payout using the Live Secret Key
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: options.currency.toLowerCase(),
      statement_descriptor: options.description.substring(0, 22).toUpperCase() || 'E-CHECK PAYOUT',
      method: 'standard',
    });

    return { 
      success: true, 
      id: payout.id,
      status: payout.status,
      message: "ACH Payout initiated from your Stripe Balance."
    };
  } catch (error: any) {
    console.error('[STRIPE_PAYOUT_ERROR]', error);
    return { 
      success: false, 
      error: error.message || "The Stripe payout could not be authorized. Check your account balance and API permissions."
    };
  }
}
