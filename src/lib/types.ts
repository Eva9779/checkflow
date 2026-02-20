
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
  type: 'sent' | 'received' | 'requested';
  recipientName: string;
  recipientAddress?: string;
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  checkNumber?: string;
  fromAccountId?: string;
  createdAt: any;
}
