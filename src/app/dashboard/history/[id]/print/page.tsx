'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, ShieldCheck, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrintCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const transactionRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'eCheckTransactions', id);
  }, [db, user, id]);

  const { data: transaction, isLoading: txLoading } = useDoc<Transaction>(transactionRef);

  const accountRef = useMemoFirebase(() => {
    if (!db || !user || !transaction?.senderBankAccountId) return null;
    return doc(db, 'users', user.uid, 'bankAccounts', transaction.senderBankAccountId);
  }, [db, user, transaction]);

  const { data: account, isLoading: accLoading } = useDoc<BankAccount>(accountRef);

  const payerName = user?.displayName || 'Authorized Business Entity';
  const payeeName = transaction?.recipientName || 'Valued Recipient';
  const payerAddress = account?.bankAddress || 'Authorized E-Check Issuer';
  const bankName = account?.bankName || 'Financial Institution';
  const routingNumber = account?.routingNumber || '000000000';
  const accountNumber = account?.accountNumber || '000000000';
  const checkNumber = transaction?.checkNumber || '1001';
  const fractionalRouting = account?.fractionalRouting || '';

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

  if (txLoading || accLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
    </div>
  );

  if (!transaction) return <div className="p-20 text-center font-bold">Transaction record not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto no-print mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.back()} className="h-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
          </Button>
          <h2 className="text-xl font-bold px-2">E-Check Verification</h2>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90 text-white font-bold px-8 h-12">
            <Printer className="w-5 h-5 mr-2" /> Print for Bank Deposit
          </Button>
        </div>
      </div>

      <div className="max-w-[8.5in] mx-auto space-y-12 pb-20">
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-8 print:border-[1.5px]">
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-0.5">
                <p className="font-bold text-lg uppercase tracking-tight leading-none">{payerName}</p>
                <div className="text-[10px] font-medium leading-tight max-w-[280px] uppercase opacity-80">
                  {payerAddress}
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-2xl font-bold font-mono tracking-tighter leading-none mb-1">{checkNumber}</p>
                {fractionalRouting && (
                  <p className="text-[8px] font-bold text-slate-500 mb-2">{fractionalRouting}</p>
                )}
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold">Date:</span>
                  <div className="border-b-[1.5px] border-black min-w-[140px] text-center font-mono py-0.5 font-bold text-lg">
                    {transaction.initiatedAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-4 mt-6">
              <span className="text-[11px] font-extrabold uppercase min-w-[100px] pb-1">Pay to the Order of:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-1 font-bold text-xl uppercase tracking-tighter">
                {payeeName}
              </div>
              <div className="relative flex items-center ml-4">
                <span className="absolute left-2 font-bold text-xl">$</span>
                <div className="border-[2px] border-black px-4 py-2 min-w-[160px] text-right font-mono text-2xl bg-white font-bold">
                  {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-4">
              <div className="flex-1 border-b-[1.5px] border-black pb-1 italic text-[14px] font-bold tracking-tight">
                {amountInWords(transaction.amount)}
              </div>
            </div>

            <div className="absolute bottom-[1.0in] left-8">
               <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Financial Institution</p>
               <p className="font-bold text-[13px] leading-tight uppercase">{bankName}</p>
            </div>

            <div className="absolute bottom-[0.9in] right-8 left-[3in] flex items-end gap-8">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase pb-0.5">Memo:</span>
                <div className="flex-1 border-b-[1.5px] border-black pb-0.5 text-xs font-bold truncate">
                  {transaction.memo}
                </div>
              </div>
              <div className="w-[2.5in] flex flex-col items-center">
                <div className="h-12 w-full flex items-center justify-center overflow-hidden">
                  {transaction.signatureData ? (
                    <img 
                      src={transaction.signatureData} 
                      alt="Authorized Signature" 
                      className="max-h-full max-w-full object-contain mix-blend-multiply" 
                    />
                  ) : (
                    <div className="italic text-[10px] text-muted-foreground pb-2">Authorized Signature Required</div>
                  )}
                </div>
                <div className="w-full border-b-[1.5px] border-black"></div>
                <p className="text-[8px] text-center uppercase font-bold tracking-tighter opacity-70 mt-1">
                  Authorized Signature
                </p>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full flex justify-center micr-line text-[22px] tracking-[0.45em] text-black">
               ⑆{routingNumber}⑆  {accountNumber}⑈  {checkNumber}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0 print-page-break">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-10 rounded-sm">
            <div className="absolute top-8 right-12 w-[3.5in]">
              <div className="border-b-[2px] border-black w-full mb-1"></div>
              <p className="text-[11px] text-center font-bold uppercase tracking-wider mb-4">Endorse Here</p>
              
              <div className="flex items-center justify-center gap-3 mb-10 bg-slate-50/50 p-3 rounded border border-dashed border-slate-300">
                <div className="w-6 h-6 border-2 border-black/20 flex items-center justify-center bg-white">
                  <Square className="w-5 h-5 text-transparent" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-black/70">
                  Check here if mobile deposit
                </span>
              </div>

              <div className="space-y-6 opacity-10">
                <div className="border-b-[1.5px] border-black w-full"></div>
                <div className="border-b-[1.5px] border-black w-full"></div>
                <div className="border-b-[1.5px] border-black w-full"></div>
              </div>

              <div className="mt-8 pt-4 border-t-[2px] border-black border-dashed">
                <p className="text-[10px] text-center font-bold uppercase leading-tight text-black/60">
                  DO NOT WRITE, STAMP, OR SIGN BELOW THIS LINE
                </p>
                <p className="text-[8px] text-center uppercase mt-1 opacity-50">Reserved for Financial Institution Use Only</p>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none rotate-[-35deg]">
              <span className="text-7xl font-black uppercase tracking-[0.3em]">Security Document</span>
            </div>
            
            <div className="absolute bottom-8 left-10 flex items-center gap-3 text-black/30">
              <ShieldCheck className="w-6 h-6" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-[0.25em]">Verified Digital E-Check</span>
                <span className="text-[8px] font-bold">Compliant with U.S. Check 21 Processing Standards</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
