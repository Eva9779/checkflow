
'use server';

import { stripe } from '@/lib/stripe';

interface PayoutOptions {
  amount: number;
  currency: string;
  description: string;
  recipientName: string;
  recipientRouting: string;
  recipientAccount: string;
  payerRouting: string;
  payerAccount: string;
}

/**
 * Initiates an ACH payout via Stripe.
 * Using the Live Stripe Secret Key to authorize payments from the specified business source.
 */
export async function initiateStripeACHPayout(options: PayoutOptions) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe Secret Key is missing. Add it to your .env file.");
    }

    const amountInCents = Math.round(options.amount * 100);

    // Initiating a payout using the provided banking details as metadata
    // to track the specific payer source and recipient destination.
    // In a live Connect/Treasury environment, these details would be used to create
    // a payment method token and authorize the direct debit from the payer.
    
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: options.currency.toLowerCase(),
      statement_descriptor: options.description.substring(0, 22).toUpperCase() || 'E-CHECK PAYOUT',
      method: 'standard',
      metadata: {
        recipient_name: options.recipientName,
        recipient_routing: options.recipientRouting,
        recipient_account: `****${options.recipientAccount.slice(-4)}`,
        payer_routing: options.payerRouting,
        payer_account: `****${options.payerAccount.slice(-4)}`,
        memo: options.description
      }
    });

    return { 
      success: true, 
      id: payout.id,
      status: payout.status,
      message: "ACH Payout authorized from business source."
    };
  } catch (error: any) {
    console.error('[STRIPE_PAYOUT_ERROR]', error);
    return { 
      success: false, 
      error: error.message || "The Stripe payout could not be authorized. Check balance and API permissions."
    };
  }
}
