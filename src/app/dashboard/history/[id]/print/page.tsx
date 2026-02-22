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
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-8 print:border-[1.5px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="font-black text-xl uppercase tracking-tight leading-none mb-1">{payerName}</p>
                <div className="text-[10px] font-bold leading-tight max-w-[320px] uppercase opacity-80">
                  {payerAddress}
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-2xl font-black font-mono tracking-tighter leading-none mb-4">{checkNumber}</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[11px] uppercase font-black">Date:</span>
                  <div className="border-b-[2px] border-black min-w-[160px] text-center font-mono py-1 font-black text-xl">
                    {transaction.initiatedAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex items-end gap-4">
                <span className="text-[11px] font-black uppercase min-w-[120px] pb-1">Pay to the Order of:</span>
                <div className="flex-1 border-b-[2px] border-black pb-1 font-black text-3xl uppercase tracking-tight">
                  {payeeName}
                </div>
                <div className="relative flex items-center ml-4">
                  <span className="absolute left-2 font-black text-xl">$</span>
                  <div className="border-[3px] border-black px-6 py-3 min-w-[180px] text-right font-mono text-3xl bg-white font-black">
                    {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 border-b-[2.5px] border-black pb-1 italic text-[18px] font-black tracking-tight">
                  {amountInWords(transaction.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-end pb-12">
              <div className="col-span-4">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Financial Institution</p>
                <p className="font-black text-[14px] leading-tight uppercase">{bankName}</p>
              </div>
              <div className="col-span-4 flex items-end">
                <span className="text-[11px] font-black uppercase pb-1 mr-3">Memo:</span>
                <div className="flex-1 border-b-[2px] border-black pb-1 text-sm font-black truncate">
                  {transaction.memo}
                </div>
              </div>
              <div className="col-span-4 flex flex-col items-center">
                <div className="h-16 w-full flex items-center justify-center relative">
                  {transaction.signatureData && (
                    <img 
                      src={transaction.signatureData} 
                      alt="Authorized Signature" 
                      className="absolute bottom-1 max-h-[80px] max-w-full object-contain mix-blend-multiply" 
                    />
                  )}
                </div>
                <div className="w-full border-b-[2px] border-black"></div>
                <p className="text-[9px] text-center uppercase font-black tracking-tighter opacity-70 mt-1.5">
                  Authorized Signature
                </p>
              </div>
            </div>

            <div className="absolute bottom-6 left-0 w-full flex justify-center micr-line text-[24px] tracking-[0.45em] text-black font-bold">
               ⑈{checkNumber}⑈ ⑆{routingNumber}⑆ {accountNumber}⑈
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0 print-page-break">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-0 rounded-sm overflow-hidden flex">
            {/* Left Content Area */}
            <div className="flex-1 p-10 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="flex items-center gap-4 text-black/40">
                  <ShieldCheck className="w-16 h-16" />
                  <div className="flex flex-col">
                    <span className="text-[18px] uppercase font-black tracking-[0.25em]">Verified Secure E-Check</span>
                    <span className="text-[12px] font-bold">Standard U.S. Check 21 Processing Compliant</span>
                  </div>
                </div>
                
                <Card className="bg-white/40 border-black/20 shadow-none w-80">
                  <CardContent className="p-6">
                    <p className="text-[12px] font-black uppercase text-black/60 mb-4 border-b border-black/10 pb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Security Features
                    </p>
                    <ul className="text-[11px] uppercase font-black space-y-4 text-black/70">
                      <li>• Microprint Signature Line</li>
                      <li>• Unique Check Verification Code</li>
                      <li>• Digital Fraud Protection Surface</li>
                      <li>• High-Resolution MICR Scanning Support</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Watermark Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-35deg] select-none">
                <span className="text-[10rem] font-black uppercase tracking-[0.4em]">Original Document</span>
              </div>
            </div>

            {/* Endorsement Area Column */}
            <div className="w-[3.5in] h-full border-l-[4px] border-black/10 bg-white p-8">
              <div className="relative h-full flex flex-col">
                <p className="text-[14px] font-black uppercase tracking-[0.15em] text-black mb-12">Endorse Here</p>
                
                {/* Signature Lines Container */}
                <div className="relative w-full space-y-12 mb-8">
                  {/* Line 1 - Signature target */}
                  <div className="relative border-b-[3px] border-black w-full h-8">
                    {endorsementSignature && (
                      <div className="absolute bottom-[-10px] left-0 w-full flex justify-center pointer-events-none">
                        <img 
                          src={endorsementSignature} 
                          alt="Endorsement Signature" 
                          className="max-h-[100px] w-auto object-contain mix-blend-multiply scale-125" 
                        />
                      </div>
                    )}
                  </div>
                  {/* Line 2 */}
                  <div className="border-b-[3px] border-black w-full h-8"></div>
                  {/* Line 3 */}
                  <div className="border-b-[3px] border-black w-full h-8"></div>
                </div>

                <div className="mt-8 space-y-6">
                  {/* Mobile Deposit Section */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border-[5px] border-black bg-white flex items-center justify-center shrink-0 shadow-sm">
                      {isMobileDeposit && <Check className="w-10 h-10 text-black stroke-[8px]" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="text-[12px] font-black uppercase text-black block mb-2 leading-none tracking-tight">
                        Check here for mobile deposit
                      </span>
                      {isMobileDeposit && (
                        <div className="text-[13px] font-black uppercase leading-tight text-black mt-3 bg-slate-50 p-3 rounded border-2 border-black/15">
                          For Mobile Deposit Only <br/> 
                          {depositBankName && (
                            <span className="text-[15px] text-accent tracking-tighter mt-1 block font-black">
                              at {depositBankName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bottom Limit Notice */}
                <div className="mt-auto border-t-[5px] border-black border-dashed pt-6">
                  <p className="text-[14px] text-center font-black uppercase text-black leading-none tracking-tighter">
                    DO NOT WRITE, STAMP, OR SIGN BELOW THIS LINE
                  </p>
                  <p className="text-[10px] text-center uppercase opacity-40 mt-2 font-black tracking-tight">Reserved for Financial Institution Use Only</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
