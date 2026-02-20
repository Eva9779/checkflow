
'use client';

import { use } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, ShieldCheck, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function PrintCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const transactionRef = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'transactions', id);
  }, [db, user, id]);

  const { data: transaction, loading: txLoading } = useDoc<Transaction>(transactionRef);

  const accountRef = useMemo(() => {
    if (!db || !user || !transaction?.fromAccountId) return null;
    return doc(db, 'users', user.uid, 'accounts', transaction.fromAccountId);
  }, [db, user, transaction]);

  const { data: account, loading: accLoading } = useDoc<BankAccount>(accountRef);

  // LOGIC FOR PRINTING
  // 1. If type is 'sent', User is Payer, recipientName is Payee. Bank is accountRef.
  // 2. If type is 'requested' and completed, payerName/payerBank info is Payer, User is Payee.
  // 3. If type is 'received', external party is Payer, User is Payee.

  const isFulfilledRequest = transaction?.type === 'requested' && transaction?.status === 'completed';
  const isReceived = transaction?.type === 'received' || isFulfilledRequest;

  const payerName = isFulfilledRequest 
    ? (transaction?.recipientName || 'External Payer') 
    : isReceived ? transaction?.recipientName : (user?.displayName || 'Business Account');
    
  const payeeName = isReceived ? (user?.displayName || user?.email || 'Valued Recipient') : transaction?.recipientName;
  
  const payerAddress = isFulfilledRequest
    ? transaction?.payerBankAddress
    : isReceived 
    ? transaction?.recipientAddress 
    : (account?.bankAddress || 'Authorized E-Check Issuer\nDigital Payment Service');

  const bankName = isFulfilledRequest 
    ? transaction?.payerBankName 
    : (account?.bankName || 'Standard Bank Entity');

  const routingNumber = isFulfilledRequest 
    ? transaction?.payerRoutingNumber 
    : (account?.routingNumber || '000000000');

  const accountNumber = isFulfilledRequest 
    ? transaction?.payerAccountNumber 
    : (account?.accountNumber || '****0000');

  const amountInWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convert_less_than_thousand = (n: number): string => {
      if (n === 0) return '';
      let res = '';
      if (n >= 100) {
        res += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        res += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        res += teens[n - 10] + ' ';
        return res;
      }
      if (n > 0) res += ones[n] + ' ';
      return res;
    };

    const whole = Math.floor(num);
    const cents = Math.round((num - whole) * 100);
    
    let result = '';
    if (whole === 0) result = 'Zero';
    else {
      if (whole >= 1000) {
        result += convert_less_than_thousand(Math.floor(whole / 1000)) + 'Thousand ';
        result += convert_less_than_thousand(whole % 1000);
      } else {
        result += convert_less_than_thousand(whole);
      }
    }

    return `${result} and ${cents}/100 Dollars`;
  };

  if (txLoading || (transaction?.fromAccountId && accLoading)) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
    </div>
  );

  if (!transaction) return <div className="p-20 text-center">Transaction not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto no-print mb-8 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-accent" />
            {isReceived ? 'Official Check Ready for Deposit' : 'Verified U.S. Business E-Check Format'}
          </div>
          <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90">
            <Printer className="w-4 h-4 mr-2" /> Print & Save PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-2xl p-8 check-container border border-slate-200 rounded-sm overflow-hidden">
        <div className="relative border-2 border-slate-300 p-8 min-h-[420px]">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="font-bold text-lg uppercase tracking-wider">{payerName}</p>
              <div className="text-sm text-slate-500 whitespace-pre-line max-w-[250px] mt-1">
                {payerAddress || 'U.S. Authorized Payer'}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black font-mono">#{transaction.checkNumber || '1001'}</p>
              <div className="mt-4 flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                <p className="border-b-2 border-slate-300 min-w-[150px] text-center font-mono py-1 font-bold">{transaction.date}</p>
              </div>
            </div>
          </div>

          {/* Payee Line */}
          <div className="flex items-end gap-4 mb-8">
            <span className="text-sm font-bold uppercase min-w-[120px] pb-1">Pay to the Order of:</span>
            <div className="flex-1 border-b-2 border-slate-300 pb-1 font-bold text-xl uppercase tracking-tight">
              {payeeName}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2 font-bold text-lg">$</span>
              <div className="border-2 border-slate-400 p-2 min-w-[160px] text-right font-mono text-2xl bg-slate-50 font-bold">
                {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="border-b-2 border-slate-300 pb-1 mb-8 italic text-slate-800 font-medium">
            {amountInWords(transaction.amount)}
          </div>

          {/* Bank & Memo */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bank Branch</p>
              <p className="font-bold text-lg">{bankName}</p>
              <p className="text-xs text-slate-500 font-medium">Federal Reserve Routing System Member</p>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-xs font-black uppercase text-slate-400 pb-1">Memo:</span>
              <div className="flex-1 border-b-2 border-slate-300 pb-1 text-sm font-bold">
                {transaction.memo}
              </div>
            </div>
          </div>

          {/* Fractional Routing */}
          {account?.fractionalRouting && (
            <div className="absolute bottom-24 right-8 text-[10px] font-mono text-slate-400">
              {account.fractionalRouting}
            </div>
          )}

          {/* MICR Line */}
          <div className="absolute bottom-8 left-0 w-full flex justify-center micr-font text-2xl tracking-[0.4em] font-medium opacity-90">
             c {routingNumber} c {accountNumber.replace('****', '0000')} d {transaction.checkNumber || '1001'}
          </div>

          {/* Watermark/Security */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-30deg]">
             <span className="text-8xl font-black uppercase tracking-tighter">E-CheckFlow Verified</span>
          </div>
        </div>

        <div className="mt-12 no-print text-center text-[10px] text-muted-foreground border-t border-dashed pt-6 space-y-2">
          <p>THIS IS A LEGALLY BINDING ELECTRONIC CHECK. PRINT ON CHECK STOCK OR PLAIN PAPER FOR MOBILE DEPOSIT.</p>
          <div className="flex justify-center gap-4">
             <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure Record</span>
             <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Digital Copy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
