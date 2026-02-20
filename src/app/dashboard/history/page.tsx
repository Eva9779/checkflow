
'use client';

import { useMemo } from 'react';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Loader2 } from 'lucide-react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function TransactionHistoryPage() {
  const db = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [db, user]);

  const { data: transactions, loading } = useCollection(transactionsQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">Transaction History</h1>
          <p className="text-muted-foreground">View and manage all your sent and received e-checks.</p>
        </div>
        <Button variant="outline" className="flex gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Button variant="outline">All Time</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">Recent Transactions</h2>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>
        ) : (
          <TransactionList transactions={transactions || []} />
        )}
      </div>
    </div>
  );
}
