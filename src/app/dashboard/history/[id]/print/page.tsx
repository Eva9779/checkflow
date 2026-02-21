'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, ShieldCheck, Info } from 'lucide-react';
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

  const payerName = user?.displayName || 'Authorized Business Entity';
  const payeeName = transaction?.recipientName || 'Valued Recipient';
  const payerAddress = account?.bankAddress || 'Authorized E-Check Issuer';
  const bankName = account?.bankName || 'Financial Institution';
  const routingNumber = account?.routingNumber || '000000000';
  const accountNumber = account?.accountNumber || '****0000';

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

  if (!transaction) return <div className="p-20 text-center">Transaction not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto no-print mb-8 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
        </Button>
        <div className="flex gap-4">
          <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90 text-white font-bold px-6">
            <Printer className="w-4 h-4 mr-2" /> Print for Bank Deposit
          </Button>
        </div>
      </div>

      <div className="max-w-[8.5in] mx-auto space-y-8">
        {/* FRONT OF CHECK */}
        <div className="bg-white shadow-2xl check-container border border-slate-200 rounded-sm overflow-hidden aspect-[8.5/11] p-12">
          <div className="relative border-[1px] border-slate-300 p-10 h-[3.5in] w-full bg-[#fcfcfc] rounded-md shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                <p className="font-bold text-lg uppercase tracking-tight text-slate-900">{payerName}</p>
                <div className="text-[11px] text-slate-500 font-medium whitespace-pre-line leading-tight max-w-[240px]">
                  {payerAddress}
                </div>
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end mb-4">
                  <p className="text-2xl font-bold font-mono text-slate-900">{transaction.checkNumber || '1001'}</p>
                  {account?.fractionalRouting && (
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{account.fractionalRouting}</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date:</span>
                  <div className="border-b-[1px] border-slate-400 min-w-[140px] text-center font-mono py-1 font-bold text-sm text-slate-900">
                    {transaction.date}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-4 mb-8">
              <span className="text-[11px] font-bold uppercase min-w-[120px] pb-1 text-slate-400">Pay to the Order of:</span>
              <div className="flex-1 border-b-[1px] border-slate-400 pb-1 font-bold text-xl uppercase tracking-tight text-slate-900">
                {payeeName}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-2 font-bold text-lg text-slate-900">$</span>
                <div className="border-[2px] border-slate-300 px-4 py-2 min-w-[160px] text-right font-mono text-2xl bg-white shadow-sm font-bold text-slate-900">
                  {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-10">
              <div className="flex-1 border-b-[1px] border-slate-400 pb-1 italic text-[14px] text-slate-800 font-bold tracking-wide">
                {amountInWords(transaction.amount)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-16">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial Institution</p>
                <p className="font-bold text-sm leading-tight text-slate-800">{bankName}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">U.S. Federal Reserve Routing Member</p>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-[10px] font-bold uppercase text-slate-400 pb-1">Memo:</span>
                  <div className="flex-1 border-b-[1px] border-slate-400 pb-1 text-xs font-bold text-slate-700">
                    {transaction.memo}
                  </div>
                </div>
                <div className="relative">
                  <div className="border-b-[1px] border-slate-400 w-full mb-1"></div>
                  <p className="text-[9px] text-center uppercase font-bold text-slate-400 tracking-tighter">Authorized Signature - Professional Electronic Document</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-full flex justify-center micr-line text-2xl tracking-[0.3em] font-medium text-black">
               ⑆{routingNumber}⑆ {accountNumber.replace('****', '0000')}⑈ {transaction.checkNumber || '1001'}
            </div>
          </div>

          <div className="mt-12 no-print">
            <div className="bg-slate-50 border-[1px] border-dashed border-slate-200 p-8 rounded-xl">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-800">
                <ShieldCheck className="w-5 h-5 text-accent" /> Professional Security Standards
              </h3>
              <ul className="text-xs space-y-3 text-slate-600 list-disc pl-5 font-medium">
                <li>This document is a legally valid U.S. Business E-Check formatted per Reg CC.</li>
                <li>Print on high-quality white paper using a Laser Jet printer for best results.</li>
                <li>The MICR line at the bottom is optimized for mobile deposit scanners.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* BACK OF CHECK (Print Only / Reference) */}
        <div className="bg-white shadow-2xl check-container border border-slate-200 rounded-sm overflow-hidden aspect-[8.5/11] p-12 print-page-break">
          <div className="relative border-[1px] border-slate-300 h-[3.5in] w-full bg-[#fafafa] p-8 rounded-md">
            <div className="absolute top-8 right-8 w-1/3">
              <div className="border-b-[1px] border-slate-400 w-full mb-1"></div>
              <p className="text-[9px] text-center font-bold text-slate-400 uppercase">Endorse Here</p>
              <div className="h-20 border-b-[1px] border-slate-400 border-dashed mb-1 opacity-40"></div>
              <p className="text-[8px] text-center font-bold text-slate-400 uppercase leading-tight">
                DO NOT WRITE, STAMP, OR SIGN<br />BELOW THIS LINE
              </p>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-45deg]">
              <div className="text-4xl font-bold text-black flex flex-col items-center gap-4">
                <span>SECURITY DOCUMENT</span>
                <span>SECURITY DOCUMENT</span>
                <span>SECURITY DOCUMENT</span>
              </div>
            </div>
            
            <div className="mt-40 space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Endorsement Verification Area</span>
              </div>
              <div className="grid grid-cols-12 gap-1 h-2 opacity-10">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="bg-slate-900 rounded-full w-full h-full"></div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-8 border border-dashed rounded-xl bg-slate-50 no-print">
            <h3 className="font-bold text-slate-800 mb-2">Printing the Back</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Some banks require the endorsement side to be printed on the reverse side of the front. You can print the front, then flip the page and print the back to match standard bank processing requirements.
            </p>
            <div className="flex gap-4">
              <div className="w-1/2 p-4 bg-white rounded border text-[10px] flex flex-col items-center text-center gap-2">
                <div className="w-full h-8 bg-slate-100 rounded"></div>
                <span>Step 1: Print Front</span>
              </div>
              <div className="w-1/2 p-4 bg-white rounded border text-[10px] flex flex-col items-center text-center gap-2">
                <div className="w-full h-8 bg-slate-100 rounded border-t-4 border-t-accent"></div>
                <span>Step 2: Print Back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
