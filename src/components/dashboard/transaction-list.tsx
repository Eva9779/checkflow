
'use client';

import { Transaction } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border-dashed border-2 text-muted-foreground">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <Card key={tx.id} className="p-4 shadow-sm border-none hover:bg-secondary/20 transition-colors flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105",
              tx.type === 'sent' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            )}>
              {tx.type === 'sent' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{tx.recipientName}</p>
                {tx.checkNumber && (
                  <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">#{tx.checkNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{tx.date}</p>
                <span className="text-xs text-muted-foreground/30">•</span>
                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{tx.memo}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={cn(
                "font-bold text-lg",
                tx.type === 'sent' ? "text-foreground" : "text-accent"
              )}>
                {tx.type === 'sent' ? '-' : '+'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-end gap-1 mt-1">
                {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                {tx.status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                {tx.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-wider",
                  tx.status === 'completed' && "text-green-500",
                  tx.status === 'pending' && "text-yellow-500",
                  tx.status === 'failed' && "text-red-500"
                )}>
                  {tx.status}
                </span>
              </div>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent">
              <Link href={`/dashboard/history/${tx.id}/print`}>
                <Printer className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
