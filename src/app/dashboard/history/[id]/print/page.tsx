'use client';

import { use, useState, useEffect } from 'react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, ShieldCheck, Pencil, Lock, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SignaturePad } from '@/components/dashboard/signature-pad';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PrintCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

  const [isMobileDeposit, setIsMobileDeposit] = useState(false);
  const [depositBankName, setDepositBankName] = useState('');
  const [hasSetDefaultBank, setHasSetDefaultBank] = useState(false);
  const [endorsementSignature, setEndorsementSignature] = useState<string | null>(null);

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

  useEffect(() => {
    if (account?.bankName && !hasSetDefaultBank) {
      setDepositBankName(account.bankName);
      setHasSetDefaultBank(true);
    }
  }, [account, hasSetDefaultBank]);

  const payerName = user?.displayName || 'Authorized Business Entity';
  const payeeName = transaction?.recipientName || 'Valued Recipient';
  const payerAddress = account?.bankAddress || 'Authorized E-Check Issuer';
  const bankName = account?.bankName || 'Financial Institution';
  const routingNumber = account?.routingNumber || '000000000';
  const accountNumber = account?.accountNumber || '000000000';
  const checkNumber = transaction?.checkNumber || '1001';

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
      <div className="max-w-4xl mx-auto no-print mb-8 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border">
          <div className="space-y-1">
            <Button variant="ghost" onClick={() => router.back()} className="h-8">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
            </Button>
            <h2 className="text-xl font-bold px-2">E-Check Verification</h2>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90 text-white font-bold px-8 h-12 rounded-xl">
              <Printer className="w-5 h-5 mr-2" /> Print for Bank Deposit
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Pencil className="w-5 h-5 text-accent" /> Endorsement Preparation
            </CardTitle>
            <CardDescription className="text-sm">
              Prepare the back of the check for mobile or physical deposit by signing below.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="mobile-deposit" 
                    checked={isMobileDeposit} 
                    onCheckedChange={(checked) => setIsMobileDeposit(!!checked)}
                    className="w-5 h-5"
                  />
                  <Label htmlFor="mobile-deposit" className="text-sm font-semibold cursor-pointer">
                    Mark as Mobile Deposit
                  </Label>
                </div>
                
                {isMobileDeposit && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="deposit-bank" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deposit Bank Name</Label>
                    <Input 
                      id="deposit-bank"
                      placeholder="e.g. Chase Bank"
                      value={depositBankName}
                      onChange={(e) => setDepositBankName(e.target.value)}
                      className="h-11 rounded-lg border-2"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recipient Endorsement Signature</Label>
                <SignaturePad onSave={(data) => setEndorsementSignature(data)} onClear={() => setEndorsementSignature(null)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-[8.5in] mx-auto space-y-12 pb-20">
        {/* Front Side */}
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f8fbfe] p-6 print:border-[1.5px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="font-bold text-lg uppercase tracking-tight leading-none mb-1">{payerName}</p>
                <div className="text-[9px] font-medium leading-tight max-w-[300px] uppercase opacity-80">
                  {payerAddress}
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-xl font-bold font-mono tracking-tighter leading-none mb-4">{checkNumber}</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] uppercase font-bold">Date:</span>
                  <div className="border-b border-black min-w-[140px] text-center font-mono py-1 font-bold text-sm">
                    {transaction.initiatedAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-end gap-4 relative">
                <span className="text-[10px] font-bold uppercase min-w-[100px] pb-1">Pay to the Order of:</span>
                <div className="flex-1 border-b border-black pb-1 font-bold text-xl uppercase tracking-tight">
                  {payeeName}
                </div>
                <div className="relative flex items-center ml-4">
                  <span className="absolute left-1.5 font-bold text-lg">$</span>
                  <div className="border-[2px] border-black px-4 py-2 min-w-[150px] text-right font-mono text-xl bg-white font-bold">
                    {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 border-b border-black pb-1 italic text-[14px] font-medium tracking-tight">
                  {amountInWords(transaction.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-end pb-8">
              <div className="col-span-4">
                <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Financial Institution</p>
                <p className="font-bold text-[12px] leading-tight uppercase">{bankName}</p>
              </div>
              <div className="col-span-4 flex items-end">
                <span className="text-[10px] font-bold uppercase pb-1 mr-2">Memo:</span>
                <div className="flex-1 border-b border-black pb-1 text-xs font-medium truncate">
                  {transaction.memo}
                </div>
              </div>
              <div className="col-span-4 flex flex-col items-center">
                <div className="h-12 w-full flex items-center justify-center relative">
                  {transaction.signatureData && (
                    <img 
                      src={transaction.signatureData} 
                      alt="Authorized Signature" 
                      className="absolute bottom-1 max-h-[60px] max-w-full object-contain mix-blend-multiply" 
                    />
                  )}
                </div>
                <div className="w-full border-b border-black"></div>
                <p className="text-[8px] text-center uppercase font-bold tracking-tighter opacity-70 mt-1">
                  Authorized Signature
                </p>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full flex justify-center micr-line text-[20px] tracking-[0.45em] text-black font-medium">
               ⑈{checkNumber}⑈ ⑆{routingNumber}⑆ {accountNumber}⑈
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0 print-page-break">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f8fbfe] p-0 rounded-sm overflow-hidden flex">
            {/* Left Content Area (Security & Instructions) */}
            <div className="flex-1 p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-black/40">
                  <ShieldCheck className="w-12 h-12" />
                  <div className="flex flex-col">
                    <span className="text-[14px] uppercase font-bold tracking-[0.2em]">Verified Secure E-Check</span>
                    <span className="text-[10px] font-medium">Standard U.S. Check 21 Processing Compliant</span>
                  </div>
                </div>
                
                <Card className="bg-white/40 border-black/10 shadow-none w-64">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold uppercase text-black/50 mb-3 border-b border-black/5 pb-1 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Security Features
                    </p>
                    <ul className="text-[9px] uppercase font-bold space-y-2 text-black/60">
                      <li>• Microprint Signature Line</li>
                      <li>• Unique Verification Code</li>
                      <li>• Fraud Protection Surface</li>
                      <li>• MICR Scanning Support</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-30deg] select-none">
                <span className="text-[8rem] font-bold uppercase tracking-[0.3em]">Original Document</span>
              </div>
            </div>

            {/* Endorsement Area (Trailing Edge) */}
            <div className="w-[3.2in] h-full border-l-[2px] border-black/10 bg-white p-6">
              <div className="relative h-full flex flex-col">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-black mb-10">Endorse Here</p>
                
                {/* 3 Standard Signature Lines */}
                <div className="relative w-full space-y-8 mb-6">
                  {/* Line 1 - Primary Endorsement Line */}
                  <div className="relative border-b border-black w-full h-6">
                    {endorsementSignature && (
                      <div className="absolute bottom-[-5px] left-0 w-full flex justify-center pointer-events-none">
                        <img 
                          src={endorsementSignature} 
                          alt="Endorsement" 
                          className="max-h-[70px] w-auto object-contain mix-blend-multiply scale-110" 
                        />
                      </div>
                    )}
                  </div>
                  <div className="border-b border-black w-full h-6"></div>
                  <div className="border-b border-black w-full h-6"></div>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Mobile Deposit Endorsement Text */}
                  {isMobileDeposit && (
                    <div className="text-[10px] font-bold uppercase leading-tight text-black p-2 bg-slate-50 border border-black/10 rounded">
                      For Mobile Deposit Only <br/> 
                      {depositBankName && (
                        <span className="text-[11px] text-accent tracking-tight mt-0.5 block font-bold">
                          at {depositBankName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Single Mobile Deposit Checkbox */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-6 h-6 border-[2px] border-black flex items-center justify-center shrink-0">
                      {isMobileDeposit && <Check className="w-5 h-5 text-black stroke-[4px]" />}
                    </div>
                    <span className="text-[9px] font-bold uppercase text-black leading-tight tracking-tight">
                      Check here for mobile deposit
                    </span>
                  </div>
                </div>
                
                {/* Footer Notice */}
                <div className="mt-auto border-t-[3px] border-black border-dashed pt-4">
                  <p className="text-[11px] text-center font-bold uppercase text-black leading-none tracking-tighter">
                    DO NOT WRITE BELOW THIS LINE
                  </p>
                  <p className="text-[8px] text-center uppercase opacity-40 mt-1 font-medium tracking-tight">Financial Institution Use Only</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
