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
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  checkNumber?: string;
  fromAccountId?: string;
  createdAt: any;
  // Details for verification
  payerBankName?: string;
  payerRoutingNumber?: string;
  payerAccountNumber?: string;
  payerBankAddress?: string;
  signatureData?: string;
}
