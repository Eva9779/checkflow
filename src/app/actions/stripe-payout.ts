
'use server';

import { stripe } from '@/lib/stripe';

interface PayoutOptions {
  amount: number;
  currency: string;
  recipientRouting: string;
  recipientAccount: string;
  recipientName: string;
  description: string;
}

/**
 * Initiates a real-world ACH payout via Stripe.
 * Requires Stripe Payouts or Treasury to be enabled on the account.
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

    console.log(`[STRIPE_PAYOUT_REQUEST] Mode: ${isLive ? 'LIVE' : 'TEST'} | Amount: $${options.amount}`);

    // This initiates a payout from the Stripe balance to a verified bank account.
    // Note: For sending to arbitrary third-party accounts, Stripe Connect is typically required.
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
    // Return the specific Stripe error message to the UI
    return { 
      success: false, 
      error: error.message || "The Stripe payout could not be authorized. Ensure your account is verified for payouts."
    };
  }
}
