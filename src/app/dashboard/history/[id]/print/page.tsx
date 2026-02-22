'use client';

import { use, useState, useEffect } from 'react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Transaction, BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ShieldCheck, Pencil, Printer, Check } from 'lucide-react';
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
  const [hasInitializedBank, setHasInitializedBank] = useState(false);
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
    if (account?.bankName && !hasInitializedBank) {
      setDepositBankName(account.bankName);
      setHasInitializedBank(true);
    }
  }, [account, hasInitializedBank]);

  if (txLoading || accLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
    </div>
  );

  if (!transaction) return <div className="p-20 text-center font-bold text-foreground">Transaction record not found.</div>;

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto no-print mb-8 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
          <div className="space-y-1">
            <Button variant="ghost" onClick={() => router.back()} className="h-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h2 className="text-xl font-headline font-bold px-2">Check Preparation</h2>
          </div>
          <Button 
            onClick={() => window.print()} 
            className="bg-[#8795B3] hover:bg-[#8795B3]/90 text-white font-bold px-8 h-12 rounded-xl shadow-sm"
          >
            <Printer className="w-5 h-5 mr-2" /> Print for Bank Deposit
          </Button>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Pencil className="w-5 h-5 text-accent" /> Endorsement Preparation
            </CardTitle>
            <CardDescription className="text-sm">
              Prepare the check for digital or paper deposit.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="mobile-deposit-prep" 
                    checked={isMobileDeposit} 
                    onCheckedChange={(checked) => setIsMobileDeposit(!!checked)}
                    className="w-5 h-5 border-2"
                  />
                  <Label htmlFor="mobile-deposit-prep" className="text-sm font-semibold cursor-pointer">
                    Mark as Mobile Deposit
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deposit-bank" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deposit Bank Name</Label>
                  <Input 
                    id="deposit-bank"
                    placeholder="e.g. Chase Bank"
                    value={depositBankName}
                    onChange={(e) => setDepositBankName(e.target.value)}
                    className="h-11 rounded-lg border-2 bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recipient Endorsement Signature</Label>
                <SignaturePad onSave={(data) => setEndorsementSignature(data)} onClear={() => setEndorsementSignature(null)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-full flex flex-col items-center">
        <div className="w-full max-w-[8.125in] bg-white shadow-2xl p-4 md:p-8 print:p-0 print:shadow-none print:bg-transparent rounded-lg">
          <div className="space-y-16 print:space-y-0 flex flex-col items-center">
            {/* Front of Check */}
            <div className="w-full overflow-hidden flex justify-center">
              <div className="relative border-[1px] border-black h-[3in] w-[8.125in] bg-[#fcfdfe] p-6 flex flex-col justify-between origin-top sm:scale-100 scale-[var(--check-scale)]">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[7pt] uppercase tracking-tight leading-none">{payerName}</p>
                    <p className="text-[6pt] font-medium leading-tight max-w-[180px] uppercase opacity-80">
                      {payerAddress}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[8pt] font-bold font-mono leading-none mb-1">{checkNumber}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[6pt] uppercase font-bold">Date:</span>
                      <div className="border-b border-black min-w-[70px] text-center font-mono py-0.5 font-bold text-[7pt]">
                        {transaction.initiatedAt}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end gap-2 relative">
                    <span className="text-[6pt] font-bold uppercase min-w-[50px] pb-1">Pay to the Order of:</span>
                    <div className="flex-1 border-b border-black pb-1 font-bold text-[8pt] uppercase tracking-tight">
                      {payeeName}
                    </div>
                    <div className="relative flex items-center ml-2">
                      <div className="border-[1px] border-black px-2 py-1 min-w-[90px] text-right font-mono text-[9pt] bg-white font-bold flex items-center justify-between">
                        <span>$</span>
                        <span>{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 border-b border-black pb-1 italic text-[7pt] font-medium tracking-tight">
                      {amountInWords(transaction.amount)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-end pb-5">
                  <div className="col-span-4">
                    <p className="text-[5pt] font-bold uppercase tracking-widest opacity-70 mb-0.5">Financial Institution</p>
                    <p className="font-bold text-[7pt] leading-tight uppercase">{bankName}</p>
                  </div>
                  <div className="col-span-4 flex items-end">
                    <span className="text-[6pt] font-bold uppercase pb-1 mr-2">Memo:</span>
                    <div className="flex-1 border-b border-black pb-1 text-[6pt] font-medium truncate">
                      {transaction.memo}
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col items-center">
                    <div className="h-6 w-full flex items-center justify-center relative">
                      {transaction.signatureData && (
                        <img 
                          src={transaction.signatureData} 
                          alt="Signature" 
                          className="absolute bottom-1 max-h-[24px] max-w-full object-contain mix-blend-multiply" 
                        />
                      )}
                    </div>
                    <div className="w-full border-b border-black"></div>
                    <p className="text-[5pt] text-center uppercase font-bold tracking-tighter opacity-70 mt-1 leading-none">
                      Authorized Signature
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-2 left-0 w-full flex justify-center micr-line text-[9pt] tracking-[0.4em] text-black">
                   ⑈{checkNumber}⑈ ⑆{routingNumber}⑆ {accountNumber}⑈
                </div>
              </div>
            </div>

            {/* Back of Check */}
            <div className="w-full overflow-hidden flex justify-center print-page-break">
              <div className="relative border-[1px] border-black h-[3in] w-[8.125in] bg-[#fcfdfe] p-0 flex origin-top sm:scale-100 scale-[var(--check-scale)]">
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-black/5">
                      <ShieldCheck className="w-8 h-8" />
                      <div className="flex flex-col">
                        <span className="text-[7pt] uppercase font-bold tracking-[0.1em]">Verified Secure E-Check</span>
                        <span className="text-[6pt] font-medium">U.S. Check 21 Compliant</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.01] pointer-events-none rotate-[-30deg] select-none">
                    <span className="text-[1.5rem] font-bold uppercase tracking-[0.2em]">Original Document</span>
                  </div>
                </div>

                <div className="w-[3.25in] h-full border-l-[1px] border-black/20 bg-white p-6">
                  <div className="relative h-full flex flex-col">
                    <p className="text-[8pt] font-bold uppercase tracking-[0.1em] text-black mb-3">Endorse Here</p>
                    
                    <div className="relative w-full">
                      <div className="relative border-b border-black w-full h-7 flex items-end justify-center">
                        {endorsementSignature && (
                          <img 
                            src={endorsementSignature} 
                            alt="Endorsement" 
                            className="max-h-[28px] w-auto object-contain mix-blend-multiply absolute bottom-0" 
                          />
                        )}
                      </div>
                      <div className="border-b border-black w-full h-7"></div>
                      <div className="border-b border-black w-full h-7"></div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {isMobileDeposit && (
                        <div className="text-[7.5pt] font-bold uppercase leading-tight text-black p-1.5 bg-slate-50/50 border border-black/5 rounded-sm">
                          For Mobile Deposit Only <br/> 
                          {depositBankName && (
                            <span className="text-[7pt] text-primary tracking-tight mt-0.5 block font-bold">
                              at {depositBankName}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-4 h-4 border-[2px] border-black flex items-center justify-center shrink-0 bg-white">
                          {isMobileDeposit && <Check className="w-3 h-3 text-black stroke-[4px]" />}
                        </div>
                        <span className="text-[7.5pt] font-bold uppercase text-black leading-tight tracking-tight">
                          Check for mobile deposit
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-auto border-t-[1px] border-black/10 border-dashed pt-2">
                      <p className="text-[5pt] text-center font-bold uppercase text-black opacity-40">
                        DO NOT WRITE BELOW THIS LINE
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --check-scale: 1;
        }
        @media (max-width: 8.5in) {
          :root {
            --check-scale: calc(100vw / 8.5in);
          }
        }
        @media print {
          :root {
            --check-scale: 1 !important;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
