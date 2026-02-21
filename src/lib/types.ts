export interface BankAccount {
  id: string;
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
  type: 'sent';
  recipientName: string;
  recipientAddress?: string;
  recipientRouting?: string;
  recipientAccount?: string;
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  checkNumber?: string;
  fromAccountId?: string;
  deliveryMethod: 'print' | 'stripe';
  stripeTransferId?: string;
  signatureData?: string; // Base64 encoded signature image
  createdAt: any;
  payerBankName?: string;
  payerRoutingNumber?: string;
  payerAccountNumber?: string;
  payerBankAddress?: string;
}
