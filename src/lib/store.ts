import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'requested';
  recipientName: string;
  amount: number;
  memo: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

interface ECheckStore {
  accounts: BankAccount[];
  transactions: Transaction[];
  addAccount: (account: Omit<BankAccount, 'id'>) => void;
  removeAccount: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

// Simple internal mock store
let storeState: { accounts: BankAccount[], transactions: Transaction[] } = {
  accounts: [
    { id: '1', bankName: 'Chase Personal', accountNumber: '****5678', routingNumber: '021000021', isDefault: true }
  ],
  transactions: [
    { id: '1', type: 'sent', recipientName: 'Acme Rentals', amount: 1250.00, memo: 'August Rent Payment', status: 'completed', date: '2023-10-24' },
    { id: '2', type: 'received', recipientName: 'Freelance Payout', amount: 450.50, memo: 'Design Consulting', status: 'pending', date: '2023-10-25' }
  ]
};

export const getStore = () => storeState;

export const addAccountAction = (account: Omit<BankAccount, 'id'>) => {
  const newAccount = { ...account, id: Math.random().toString(36).substr(2, 9) };
  storeState.accounts.push(newAccount);
};

export const addTransactionAction = (transaction: Omit<Transaction, 'id' | 'date' | 'status'>) => {
  const newTx: Transaction = {
    ...transaction,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString().split('T')[0],
    status: 'pending'
  };
  storeState.transactions.unshift(newTx);
};