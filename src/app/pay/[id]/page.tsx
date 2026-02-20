
'use client';

import { use, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Building2, Calendar, CreditCard, CheckCircle2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function PublicPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const userId = searchParams.get('u');
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFulfilling, setIsFulfilling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [payerInfo, setPayerInfo] = useState({
    bankName: '',
    bankAddress: '',
    routingNumber: '',
    accountNumber: '',
  });

  const txRef = useMemo(() => {
    if (!db || !userId || !id) return null;
    return doc(db, 'users', userId, 'transactions', id);
  }, [db, userId, id]);

  const { data: transaction, loading } = useDoc<Transaction>(txRef);

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txRef || !transaction) return;

    if (payerInfo.routingNumber.length !== 9) {
      toast({ title: "Invalid Routing Number", description: "Standard U.S. routing numbers must be 9 digits.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const updateData = {
      payerBankName: payerInfo.bankName,
      payerBankAddress: payerInfo.bankAddress,
      payerRoutingNumber: payerInfo.routingNumber,
      payerAccountNumber: payerInfo.accountNumber,
      status: 'completed',
      recipientAddress: payerInfo.bankAddress, // Update the record for the check face
    };

    updateDoc(txRef, updateData)
      .then(() => {
        setCompleted(true);
        toast({ title: "Payment Authorized", description: "The e-check details have been securely sent." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'update',
          requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!transaction || !userId || transaction.type !== 'requested') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h1 className="text-xl font-bold mb-2">Request Not Found</h1>
          <p className="text-muted-foreground">This payment request may have expired, been fulfilled, or is invalid.</p>
        </Card>
      </div>
    );
  }

  if (completed || transaction.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-12 space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Authorized</CardTitle>
          <CardDescription>
            Your e-check details for ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} have been securely processed and sent to the requester.
          </CardDescription>
          <p className="text-sm text-muted-foreground pt-4">You can now close this window.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg">EC</div>
          <h1 className="text-2xl font-headline font-bold">Secure E-Check Authorization</h1>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white">
          {!isFulfilling ? (
            <>
              <CardHeader className="bg-primary text-primary-foreground text-center py-10">
                <CardDescription className="text-primary-foreground/80 font-medium">Payment Requested From You</CardDescription>
                <CardTitle className="text-5xl font-headline font-bold mt-2">
                  ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <Building2 className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Requester</p>
                      <p className="font-semibold text-foreground">{transaction.recipientName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <CreditCard className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Purpose</p>
                      <p className="font-semibold text-foreground">{transaction.memo}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Calendar className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Request Date</p>
                      <p className="font-semibold text-foreground">{transaction.date}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/40 p-5 rounded-xl border border-secondary/60">
                  <p className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
                    <ShieldCheck className="w-4 h-4" /> Secure Authorization
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By clicking authorize, you will be prompted to provide your U.S. business bank details to generate a digital check. This is encrypted and sent only to the authorized requester.
                  </p>
                </div>

                <Button 
                  onClick={() => setIsFulfilling(true)}
                  className="w-full bg-accent hover:bg-accent/90 h-14 text-lg font-bold shadow-md"
                >
                  Authorize Payment
                </Button>
              </CardContent>
            </>
          ) : (
            <form onSubmit={handleFulfill}>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-4 h-4 text-accent" /> Bank Details
                </CardTitle>
                <CardDescription>Enter your U.S. business account information.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input 
                    id="bankName" 
                    placeholder="e.g. Chase, Bank of America" 
                    required 
                    value={payerInfo.bankName}
                    onChange={e => setPayerInfo({...payerInfo, bankName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAddress">Your Business Address</Label>
                  <Input 
                    id="bankAddress" 
                    placeholder="Street, City, State, Zip" 
                    required 
                    value={payerInfo.bankAddress}
                    onChange={e => setPayerInfo({...payerInfo, bankAddress: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="routing">Routing Number (9 Digits)</Label>
                    <Input 
                      id="routing" 
                      placeholder="000000000" 
                      maxLength={9} 
                      required 
                      value={payerInfo.routingNumber}
                      onChange={e => setPayerInfo({...payerInfo, routingNumber: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account">Account Number</Label>
                    <Input 
                      id="account" 
                      type="password"
                      placeholder="Your Account Number" 
                      required 
                      value={payerInfo.accountNumber}
                      onChange={e => setPayerInfo({...payerInfo, accountNumber: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-slate-50/50">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full h-12 bg-primary text-primary-foreground font-bold"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Finalize & Send E-Check'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsFulfilling(false)}
                  className="w-full text-xs"
                >
                  Go Back
                </Button>
              </CardFooter>
            </form>
          )}
          <CardFooter className="bg-slate-100 border-t flex justify-center py-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              <ShieldCheck className="w-4 h-4 text-accent" />
              AES-256 Encrypted Environment
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          Powered by <span className="font-bold text-primary">E-CheckFlow</span> Secure U.S. Payments
        </p>
      </div>
    </div>
  );
}
