'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, ShieldCheck, Download, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

  const isFulfilledRequest = transaction?.type === 'requested' && transaction?.status === 'completed';
  const isReceived = transaction?.type === 'received' || isFulfilledRequest;

  // BANK VERIFICATION DATA
  const payerName = isFulfilledRequest 
    ? (transaction?.recipientName || 'External Payer') 
    : isReceived ? transaction?.recipientName : (user?.displayName || 'Business Account');
    
  const payeeName = isReceived ? (user?.displayName || user?.email || 'Valued Recipient') : transaction?.recipientName;
  
  const payerAddress = isFulfilledRequest
    ? transaction?.payerBankAddress
    : isReceived 
    ? transaction?.recipientAddress 
    : (account?.bankAddress || 'Authorized E-Check Issuer');

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
      const thousands = Math.floor(whole / 1000);
      const remaining = whole % 1000;
      if (thousands > 0) {
        result += convert_less_than_thousand(thousands) + 'Thousand ';
      }
      result += convert_less_than_thousand(remaining);
    }

    return `*** ${result.trim()} and ${cents.toString().padStart(2, '0')}/100 Dollars ***`;
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
          <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90">
            <Printer className="w-4 h-4 mr-2" /> Print for Bank Deposit
          </Button>
        </div>
      </div>

      <div className="max-w-[8.5in] mx-auto bg-white shadow-2xl p-8 check-container border border-slate-200 rounded-sm overflow-hidden min-h-[11in]">
        {/* The Check Body */}
        <div className="relative border-[1px] border-slate-300 p-8 h-[3.5in] w-full bg-[#fdfdfd]">
          {/* Top Line: Payer & Check Number */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-0.5">
              <p className="font-bold text-base uppercase tracking-tight">{payerName}</p>
              <div className="text-[11px] text-slate-600 whitespace-pre-line leading-tight max-w-[200px]">
                {payerAddress || 'Authorized Payer'}
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end mb-2">
                <p className="text-xl font-bold font-mono">{transaction.checkNumber || '1001'}</p>
                {account?.fractionalRouting && (
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">{account.fractionalRouting}</p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">Date:</span>
                <p className="border-b-[1px] border-slate-400 min-w-[120px] text-center font-mono py-0.5 font-bold text-sm">{transaction.date}</p>
              </div>
            </div>
          </div>

          {/* Payee Line */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-[10px] font-bold uppercase min-w-[110px] pb-1">Pay to the Order of:</span>
            <div className="flex-1 border-b-[1px] border-slate-400 pb-0.5 font-bold text-lg uppercase tracking-tight">
              {payeeName}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2 font-bold text-sm">$</span>
              <div className="border-[1.5px] border-slate-400 px-3 py-1.5 min-w-[140px] text-right font-mono text-xl bg-slate-50/50 font-bold">
                {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="flex items-end gap-2 mb-6">
            <div className="flex-1 border-b-[1px] border-slate-400 pb-0.5 italic text-[13px] text-slate-900 font-semibold tracking-wide">
              {amountInWords(transaction.amount)}
            </div>
          </div>

          {/* Bank Info & Memo */}
          <div className="grid grid-cols-2 gap-10 mb-8">
            <div className="pt-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bank Information</p>
              <p className="font-bold text-sm leading-tight">{bankName}</p>
              <p className="text-[9px] text-slate-500 font-medium">U.S. Federal Reserve Routing Member</p>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-end gap-2 mb-4">
                <span className="text-[9px] font-bold uppercase text-slate-400 pb-1">Memo:</span>
                <div className="flex-1 border-b-[1px] border-slate-400 pb-0.5 text-xs font-semibold">
                  {transaction.memo}
                </div>
              </div>
              <div className="relative mt-2">
                <div className="border-b-[1px] border-slate-400 w-full mb-1"></div>
                <p className="text-[8px] text-center uppercase font-bold text-slate-400">Authorized Signature - Verified Electronic Document</p>
              </div>
            </div>
          </div>

          {/* MICR Line (The most critical part for ATM/Bank OCR) */}
          <div className="absolute bottom-6 left-0 w-full flex justify-center micr-line text-2xl tracking-[0.25em] font-medium text-black">
             ⑆{routingNumber}⑆ {accountNumber.replace('****', '0000')}⑈ {transaction.checkNumber || '1001'}
          </div>

          {/* Security Features Overlay */}
          <div className="absolute top-4 right-4 text-[7px] text-slate-300 font-mono border border-slate-100 p-1 select-none pointer-events-none">
            MICROPRINT SECURITY • MP
          </div>
        </div>

        {/* Printing Instructions & Record */}
        <div className="mt-20 no-print">
          <div className="bg-slate-50 border-[1px] border-dashed border-slate-200 p-6 rounded-lg">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-accent" /> Deposit Instructions
            </h3>
            <ul className="text-xs space-y-2 text-slate-600 list-disc pl-4">
              <li>Print this check on standard 8.5" x 11" white paper or check stock.</li>
              <li>Use high-quality black ink for best OCR recognition at ATMs and Mobile Apps.</li>
              <li>This document is a legally valid U.S. Business E-Check as defined by Check-21 regulations.</li>
              <li>For Mobile Deposit: Lay the printed check on a flat, dark surface in good lighting.</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-auto pt-20 text-center opacity-30 select-none print-only">
          <p className="text-[10px] font-mono">--- DOCUMENT CONTAINS SECURITY FEATURES TO PREVENT ALTERATION ---</p>
        </div>
      </div>
    </div>
  );
}
