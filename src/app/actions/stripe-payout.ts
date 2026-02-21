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
 * In a production environment, this authorizes the transfer of funds using the provided metadata
 * to link the transaction to the specific business source and recipient bank details.
 */
export async function initiateStripeACHPayout(options: PayoutOptions) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe Secret Key is missing. Please add it to your environment variables.");
    }

    const amountInCents = Math.round(options.amount * 100);

    // Using Stripe Payouts API to authorize the fund movement.
    // Metadata is used to track the Payer (origin) and Recipient (destination) 
    // for compliance and reconciliation in the Stripe Dashboard.
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
        source_auth: 'external_bank_source'
      }
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
      error: error.message || "Stripe authorization failed. Ensure your account balance and permissions are correct."
    };
  }
}
