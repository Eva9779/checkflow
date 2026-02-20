'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, FileText, TrendingUp, Building2, Clock, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { Transaction, BankAccount } from '@/lib/types';

export default function DashboardOverview() {
  const db = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc'),
      limit(5)
    );
  }, [db, user]);

  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'accounts');
  }, [db, user]);

  const { data: transactions, loading: txLoading } = useCollection<Transaction>(transactionsQuery as any);
  const { data: accounts, loading: accLoading } = useCollection<BankAccount>(accountsQuery as any);

  const totalBalance = (transactions || []).reduce((acc, tx) => 
    tx.type === 'received' ? acc + tx.amount : tx.type === 'sent' ? acc - tx.amount : acc, 0);

  const pendingCount = (transactions || []).filter(tx => tx.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-12 h-12" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/80 font-medium">Net Transaction Volume</CardDescription>
            <CardTitle className="text-3xl font-headline font-bold">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-primary-foreground/70">Calculated from history</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Accounts</CardTitle>
            <Building2 className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (accounts?.length || 0)}</div>
            <p className="text-xs text-muted-foreground">Connected bank accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Checks</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting clearance</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Secure Access</CardTitle>
            <FileText className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <p className="text-xs text-muted-foreground">Encrypted Data Stream</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/dashboard/send">
            <Plus className="mr-2 h-4 w-4" /> Send E-Check
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/requests">
            <Download className="mr-2 h-4 w-4" /> Request Payment
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold">Recent Transactions</h2>
            <Button variant="link" asChild>
              <Link href="/dashboard/history" className="text-accent hover:text-accent/80">View all</Link>
            </Button>
          </div>
          {txLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : (
            <TransactionList transactions={transactions || []} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-headline font-bold">Quick Insights</h2>
          <Card className="shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Real-time Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your transactions and account data are securely stored and synchronized across all your devices using Firebase Cloud Firestore.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All connections are encrypted. Bank details are never stored in plain text and are scoped to your unique account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
