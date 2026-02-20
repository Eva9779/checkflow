export interface BankAccount {
  id: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  isDefault: boolean;
  createdAt: any;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'requested';
  recipientName: string;
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  createdAt: any;
}
