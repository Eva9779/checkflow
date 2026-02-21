
'use server';

import { stripe } from '@/lib/stripe';

interface PayoutOptions {
  amount: number;
  currency: string;
  description: string;
}

/**
 * Initiates a real-world ACH payout via Stripe.
 * NOTE: In Stripe, a standard 'payout' sends funds from your Stripe balance to 
 * your verified business bank account. For sending funds to THIRD PARTIES 
 * (clients/customers) via ACH, Stripe Connect is required.
 */
export async function initiateStripeACHPayout(options: PayoutOptions) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe Secret Key is missing in the environment configuration.");
    }

    const amountInCents = Math.round(options.amount * 100);

    // Create a Payout
    // This moves funds from your Stripe Balance to your verified account.
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: options.currency.toLowerCase(),
      statement_descriptor: options.description.substring(0, 22) || 'E-CHECK PAYOUT',
      method: 'standard',
    });

    return { 
      success: true, 
      id: payout.id,
      status: payout.status,
      message: "ACH Payout initiated successfully."
    };
  } catch (error: any) {
    console.error('[STRIPE_PAYOUT_ERROR]', error);
    return { 
      success: false, 
      error: error.message || "The Stripe payout could not be authorized. Ensure your account has sufficient balance and is in Live mode."
    };
  }
}
