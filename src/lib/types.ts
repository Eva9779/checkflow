export interface BankAccount {
  id: string;
  userProfileId: string;
  bankName: string;
  bankAddress?: string;
  routingNumber: string;
  accountNumber: string;
  fractionalRouting?: string;
  isDefault: boolean;
  createdAt: any;
}

export interface Transaction {
  id: string;
  senderUserProfileId: string;
  receiverUserProfileId?: string;
  senderBankAccountId: string;
  receiverBankAccountId?: string;
  recipientName: string;
  recipientAddress?: string;
  recipientRouting?: string;
  recipientAccount?: string;
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  initiatedAt: string;
  checkNumber?: string;
  deliveryMethod: 'print' | 'stripe';
  stripeTransferId?: string;
  signatureData?: string; // Base64 encoded signature image
  createdAt: any;
  payerBankName?: string;
  payerRoutingNumber?: string;
  payerAccountNumber?: string;
  payerBankAddress?: string;
}
