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
            <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90 text-white font-bold px-8 h-12">
              <Printer className="w-5 h-5 mr-2" /> Print for Bank Deposit
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="w-5 h-5 text-accent" /> Endorsement Preparation
            </CardTitle>
            <CardDescription>
              Prepare the back of the check for mobile or physical deposit by signing below.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="mobile-deposit" 
                    checked={isMobileDeposit} 
                    onCheckedChange={(checked) => setIsMobileDeposit(!!checked)}
                  />
                  <Label htmlFor="mobile-deposit" className="text-sm font-medium leading-none cursor-pointer">
                    Mark as Mobile Deposit
                  </Label>
                </div>
                
                {isMobileDeposit && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="deposit-bank" className="text-xs font-bold uppercase text-muted-foreground">Deposit Bank Name</Label>
                    <Input 
                      id="deposit-bank"
                      placeholder="e.g. Chase Bank"
                      value={depositBankName}
                      onChange={(e) => setDepositBankName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recipient Endorsement Signature</Label>
                <SignaturePad onSave={(data) => setEndorsementSignature(data)} onClear={() => setEndorsementSignature(null)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-[8.5in] mx-auto space-y-12 pb-20">
        {/* Front Side */}
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-6 print:border-[1.5px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="font-black text-xl uppercase tracking-tight leading-none mb-1">{payerName}</p>
                <div className="text-[10px] font-bold leading-tight max-w-[280px] uppercase opacity-80">
                  {payerAddress}
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-2xl font-black font-mono tracking-tighter leading-none mb-2">{checkNumber}</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[11px] uppercase font-black">Date:</span>
                  <div className="border-b-[1.5px] border-black min-w-[140px] text-center font-mono py-1 font-black text-lg">
                    {transaction.initiatedAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-end gap-2">
                <span className="text-[11px] font-black uppercase min-w-[110px] pb-1">Pay to the Order of:</span>
                <div className="flex-1 border-b-[2px] border-black pb-1 font-black text-2xl uppercase tracking-tight">
                  {payeeName}
                </div>
                <div className="relative flex items-center ml-4">
                  <span className="absolute left-2 font-black text-xl">$</span>
                  <div className="border-[2.5px] border-black px-4 py-2 min-w-[160px] text-right font-mono text-2xl bg-white font-black">
                    {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 border-b-[2px] border-black pb-1 italic text-[16px] font-black tracking-tight">
                  {amountInWords(transaction.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-end pb-8">
              <div className="col-span-4">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Financial Institution</p>
                <p className="font-black text-[13px] leading-tight uppercase">{bankName}</p>
              </div>
              <div className="col-span-4 flex items-end">
                <span className="text-[10px] font-black uppercase pb-1 mr-2">Memo:</span>
                <div className="flex-1 border-b-[1.5px] border-black pb-1 text-xs font-black truncate">
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
                <div className="w-full border-b-[1.5px] border-black"></div>
                <p className="text-[8px] text-center uppercase font-black tracking-tighter opacity-70 mt-1">
                  Authorized Signature
                </p>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 w-full flex justify-center micr-line text-[22px] tracking-[0.45em] text-black font-bold">
               ⑈{checkNumber}⑈ ⑆{routingNumber}⑆ {accountNumber}⑈
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="bg-white shadow-2xl check-container border-[1px] border-black/5 rounded-sm overflow-hidden p-8 print:p-0 print-page-break">
          <div className="relative border-[1.5px] border-black h-[3.66in] w-full bg-[#f0f9ff] p-0 rounded-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-[3.5in] h-full border-l-[2px] border-black/20 bg-white/40 p-8">
              <div className="space-y-8">
                <div className="relative pt-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-6">Endorse Here</p>
                  
                  {/* Signature Overlay - Anchored to the top line */}
                  <div className="absolute top-[32px] left-0 w-full h-[60px] pointer-events-none flex items-center justify-center z-10">
                    {endorsementSignature && (
                      <img 
                        src={endorsementSignature} 
                        alt="Endorsement Signature" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply scale-[1.8] transform translate-y-[-12px]" 
                      />
                    )}
                  </div>
                  
                  <div className="space-y-12">
                    <div className="border-b-[2px] border-black/60 w-full h-8"></div>
                    <div className="border-b-[2px] border-black/60 w-full h-8"></div>
                    <div className="border-b-[2px] border-black/60 w-full h-8"></div>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    {/* Explicitly defined checkbox for visibility */}
                    <div className="w-7 h-7 border-[3px] border-black flex items-center justify-center bg-white shrink-0 mt-0.5 shadow-sm">
                      {isMobileDeposit && <Check className="w-6 h-6 text-black stroke-[5px]" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] font-black uppercase text-black block mb-2 leading-none tracking-tighter">
                        Check here for mobile deposit
                      </span>
                      {isMobileDeposit && (
                        <div className="text-[13px] font-black uppercase leading-snug text-black bg-white/95 p-3 rounded-md border-[2.5px] border-black shadow-sm mt-2 animate-in fade-in zoom-in-95 duration-300">
                          For Mobile Deposit Only <br/> 
                          <span className="text-[15px] text-accent tracking-tight">{depositBankName ? `at ${depositBankName}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t-[3px] border-black border-dashed pt-4 mt-12">
                    <p className="text-[12px] text-center font-black uppercase text-black leading-tight tracking-tighter">
                      DO NOT WRITE, STAMP, OR SIGN BELOW THIS LINE
                    </p>
                    <p className="text-[8px] text-center uppercase opacity-50 mt-1 font-black">Reserved for Financial Institution Use Only</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none rotate-[-35deg] select-none">
              <span className="text-9xl font-black uppercase tracking-[0.4em]">Original Document</span>
            </div>

            <div className="absolute bottom-10 left-10 space-y-6">
              <div className="flex items-center gap-4 text-black/40">
                <ShieldCheck className="w-12 h-12" />
                <div className="flex flex-col">
                  <span className="text-[14px] uppercase font-black tracking-[0.2em]">Verified Secure E-Check</span>
                  <span className="text-[10px] font-bold">Standard U.S. Check 21 Processing Compliant</span>
                </div>
              </div>
              
              <Card className="bg-white/50 border-black/20 shadow-none w-72">
                <CardContent className="p-4">
                  <p className="text-[10px] font-black uppercase text-black/50 mb-3 border-b border-black/10 pb-2 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Security Features
                  </p>
                  <ul className="text-[9px] uppercase font-black space-y-2 text-black/70">
                    <li>• Microprint Signature Line</li>
                    <li>• Unique Check Verification Code</li>
                    <li>• Digital Fraud Protection Surface</li>
                    <li>• High-Resolution MICR Scanning Support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-repeat-x opacity-15" style={{ backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
