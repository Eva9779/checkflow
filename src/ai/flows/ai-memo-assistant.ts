'use server';
/**
 * @fileOverview This file implements an AI assistant that suggests clear and concise payment memos
 * based on transaction details for e-check payments.
 *
 * - aiMemoAssistant - A function that handles the generation of payment memos.
 * - AiMemoAssistantInput - The input type for the aiMemoAssistant function.
 * - AiMemoAssistantOutput - The return type for the aiMemoAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiMemoAssistantInputSchema = z.object({
  recipientName: z.string().describe('The name of the recipient for the e-check payment.'),
  amount: z.string().describe('The amount of the payment, as a string (e.g., "$100.00").'),
  purpose: z.string().describe('The purpose or reason for the payment.'),
});
export type AiMemoAssistantInput = z.infer<typeof AiMemoAssistantInputSchema>;

const AiMemoAssistantOutputSchema = z.object({
  suggestedMemo: z.string().describe('A clear and concise payment memo suitable for an e-check.'),
});
export type AiMemoAssistantOutput = z.infer<typeof AiMemoAssistantOutputSchema>;

export async function aiMemoAssistant(input: AiMemoAssistantInput): Promise<AiMemoAssistantOutput> {
  return aiMemoAssistantFlow(input);
}

const aiMemoAssistantPrompt = ai.definePrompt({
  name: 'aiMemoAssistantPrompt',
  input: {schema: AiMemoAssistantInputSchema},
  output: {schema: AiMemoAssistantOutputSchema},
  prompt: `You are an AI assistant specialized in generating clear and concise payment memos for e-check transactions.
Your goal is to create a memo that accurately reflects the transaction's purpose in a brief and professional manner.
Do not include the amount in the memo unless it's integral to the description (e.g., "Partial payment for $500 invoice").
Keep the memo under 50 characters if possible.

Based on the following transaction details, suggest a suitable payment memo:

Recipient: {{{recipientName}}}
Amount: {{{amount}}}
Purpose: {{{purpose}}}`,
});

const aiMemoAssistantFlow = ai.defineFlow(
  {
    name: 'aiMemoAssistantFlow',
    inputSchema: AiMemoAssistantInputSchema,
    outputSchema: AiMemoAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await aiMemoAssistantPrompt(input);
    return output!;
  }
);
