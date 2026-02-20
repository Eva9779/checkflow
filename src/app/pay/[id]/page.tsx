'use client';

import { use, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, Building2, Calendar, CreditCard } from 'lucide-react';

export default function PublicPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const userId = searchParams.get('u');
  const db = useFirestore();

  const txRef = useMemo(() => {
    if (!db || !userId || !id) return null;
    return doc(db, 'users', userId, 'transactions', id);
  }, [db, userId, id]);

  const { data: transaction, loading } = useDoc<Transaction>(txRef);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!transaction || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h1 className="text-xl font-bold mb-2">Request Not Found</h1>
          <p className="text-muted-foreground">This payment request may have expired or is invalid.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">EC</div>
          <h1 className="text-2xl font-headline font-bold">E-Check Payment Request</h1>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground text-center py-8">
            <CardDescription className="text-primary-foreground/80">Amount Requested</CardDescription>
            <CardTitle className="text-4xl font-headline font-bold">
              ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Payer</p>
                  <p className="font-medium">{transaction.recipientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Memo / Purpose</p>
                  <p className="font-medium">{transaction.memo}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Requested On</p>
                  <p className="font-medium">{transaction.date}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">How to pay:</p>
              <ol className="text-xs space-y-2 text-muted-foreground list-decimal pl-4">
                <li>Review the transaction details above.</li>
                <li>Ensure you have your business routing and account number ready.</li>
                <li>E-Check processing will be handled securely by the issuer.</li>
              </ol>
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 h-12 text-lg font-bold">
              Authorize E-Check Payment
            </Button>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-center py-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              <ShieldCheck className="w-4 h-4 text-accent" />
              Verified Secure Payment Environment
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Powered by E-CheckFlow. Secure U.S. Business Payments.
        </p>
      </div>
    </div>
  );
}
