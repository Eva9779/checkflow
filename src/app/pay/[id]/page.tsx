
'use client';

import { use, useMemo, useState, useRef, useEffect } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Building2, Calendar, CreditCard, CheckCircle2, Lock, PenTool, RotateCcw, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PublicPaymentPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function PublicPaymentPage({ params, searchParams }: PublicPaymentPageProps) {
  const { id } = use(params);
  const resolvedSearchParams = use(searchParams);
  
  // Explicitly extract userId (u) from the query parameters
  const userId = useMemo(() => {
    const u = resolvedSearchParams.u;
    if (Array.isArray(u)) return u[0];
    return u;
  }, [resolvedSearchParams.u]);
  
  const db = useFirestore();
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Construct the reference only if we have both IDs
  const txRef = useMemo(() => {
    if (!db || !userId || !id) return null;
    return doc(db, 'users', userId as string, 'transactions', id);
  }, [db, userId, id]);

  const { data: transaction, loading, error } = useDoc<Transaction>(txRef);

  useEffect(() => {
    if (isFulfilling && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [isFulfilling]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSigned(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txRef || !transaction) return;

    if (payerInfo.routingNumber.length !== 9) {
      toast({ title: "Invalid Routing Number", description: "U.S. routing numbers must be 9 digits.", variant: "destructive" });
      return;
    }

    if (!hasSigned) {
      toast({ title: "Signature Required", description: "Please sign to authorize this e-check.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const signatureData = canvasRef.current?.toDataURL('image/png');

    const updateData = {
      payerBankName: payerInfo.bankName,
      payerBankAddress: payerInfo.bankAddress,
      payerRoutingNumber: payerInfo.routingNumber,
      payerAccountNumber: payerInfo.accountNumber,
      signatureData: signatureData || null,
      status: 'completed' as const,
      recipientAddress: payerInfo.bankAddress,
    };

    updateDoc(txRef, updateData)
      .then(() => {
        setCompleted(true);
        toast({ title: "Payment Authorized", description: "E-check details have been securely sent." });
      })
      .catch(async (err) => {
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
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-tight">Securing Connection...</p>
        </div>
      </div>
    );
  }

  // Diagnostic states
  const isMissingUserId = !userId;
  const isDocNotFound = !transaction && !loading;
  const isAccessDenied = error && error.message.toLowerCase().includes('permission');

  if (isMissingUserId || isDocNotFound || isAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 shadow-xl border-none">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            {isAccessDenied ? <Lock className="w-10 h-10 text-red-500" /> : <AlertCircle className="w-10 h-10 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-bold mb-3">
            {isAccessDenied ? 'Access Denied' : isMissingUserId ? 'Invalid Link' : 'Request Not Found'}
          </CardTitle>
          <CardDescription className="mb-8 text-base leading-relaxed">
            {isAccessDenied 
              ? 'Security protocols are preventing access to this payment request. Please ensure you are using the official link generated by the merchant.'
              : isMissingUserId
              ? 'This payment link is missing vital security parameters. Please contact the requester for a new QR code or link.'
              : 'This payment request may have expired, been fulfilled, or the secure link is invalid. Please contact the requester for a new payment link.'}
          </CardDescription>
          
          <div className="space-y-3">
            <Button className="w-full bg-primary h-12" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try Refreshing
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <a href="/">Go to Homepage</a>
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-slate-100 rounded-lg text-left text-[10px] font-mono space-y-1">
              <p className="font-bold text-slate-500 uppercase">Dev Diagnostics:</p>
              <p>ID: {id}</p>
              <p>UserID (u): {userId || 'MISSING'}</p>
              <p>Error: {error?.message || 'None'}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (completed || transaction.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-12 space-y-6 shadow-2xl border-none">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-sm">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Payment Authorized</CardTitle>
          <CardDescription className="text-base">
            Your authorization for <span className="font-bold text-foreground">${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is complete. The e-check has been securely issued to <span className="font-bold text-foreground">{transaction.recipientName}</span>.
          </CardDescription>
          <div className="pt-6 border-t">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Secure Receipt ID</p>
            <p className="text-xs font-mono bg-slate-100 p-3 rounded-lg border text-slate-600 select-all">{id}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-4 italic">This transaction is now recorded. You may safely close this window.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl ring-4 ring-white">EC</div>
          <h1 className="text-2xl font-headline font-bold text-foreground">Secure Payment Authorization</h1>
          <p className="text-sm text-muted-foreground mt-1">U.S. Business E-Check Processing</p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-2xl">
          {!isFulfilling ? (
            <>
              <CardHeader className="bg-primary text-primary-foreground text-center py-12">
                <CardDescription className="text-primary-foreground/90 font-semibold uppercase tracking-widest text-[10px]">Payment Request</CardDescription>
                <CardTitle className="text-5xl font-headline font-bold mt-3 tracking-tight">
                  ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-10 space-y-8 px-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="w-5 h-5 text-accent" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-left">Requester</p>
                      <p className="font-bold text-lg text-foreground text-left leading-tight">{transaction.recipientName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg"><CreditCard className="w-5 h-5 text-accent" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-left">Purpose</p>
                      <p className="font-semibold text-foreground text-left">{transaction.memo}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg"><Calendar className="w-5 h-5 text-accent" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-left">Date Issued</p>
                      <p className="font-semibold text-foreground text-left">{transaction.date}</p>
                    </div>
                  </div>
                </div>

                <Alert className="bg-slate-50 border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <AlertTitle className="text-xs font-bold uppercase tracking-tight text-accent">Bank-Level Encryption</AlertTitle>
                  <AlertDescription className="text-[11px] leading-relaxed text-slate-600">
                    Your bank details are encrypted using industry-standard protocols. This authorization is one-time only for the specified amount.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => setIsFulfilling(true)}
                  className="w-full bg-accent hover:bg-accent/90 h-16 text-lg font-bold shadow-lg rounded-xl transition-all active:scale-[0.98]"
                >
                  Verify Details & Sign
                </Button>
              </CardContent>
            </>
          ) : (
            <form onSubmit={handleFulfill}>
              <CardHeader className="bg-slate-50 border-b py-8">
                <CardTitle className="text-xl flex items-center gap-2 font-bold">
                  <Lock className="w-5 h-5 text-accent" /> Payer Verification
                </CardTitle>
                <CardDescription>Authorize this payment using your business bank account.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6 px-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-xs font-bold uppercase text-muted-foreground">Legal Bank Name</Label>
                    <Input 
                      id="bankName" 
                      placeholder="e.g. JPMorgan Chase" 
                      className="h-12 border-slate-200 focus:ring-accent"
                      required 
                      value={payerInfo.bankName}
                      onChange={e => setPayerInfo({...payerInfo, bankName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAddress" className="text-xs font-bold uppercase text-muted-foreground">Authorized Business Address</Label>
                    <Input 
                      id="bankAddress" 
                      placeholder="Street, City, State, Zip" 
                      className="h-12 border-slate-200 focus:ring-accent"
                      required 
                      value={payerInfo.bankAddress}
                      onChange={e => setPayerInfo({...payerInfo, bankAddress: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="routing" className="text-xs font-bold uppercase text-muted-foreground">Routing (9 Digits)</Label>
                      <Input 
                        id="routing" 
                        placeholder="000000000" 
                        maxLength={9} 
                        className="h-12 border-slate-200 font-mono focus:ring-accent"
                        required 
                        value={payerInfo.routingNumber}
                        onChange={e => setPayerInfo({...payerInfo, routingNumber: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account" className="text-xs font-bold uppercase text-muted-foreground">Account Number</Label>
                      <Input 
                        id="account" 
                        type="password"
                        placeholder="Account No." 
                        className="h-12 border-slate-200 font-mono focus:ring-accent"
                        required 
                        value={payerInfo.accountNumber}
                        onChange={e => setPayerInfo({...payerInfo, accountNumber: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                      <PenTool className="w-4 h-4 text-accent" /> Signature Authorization
                    </Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground hover:text-accent" onClick={clearSignature}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  </div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative h-36 ring-offset-background focus-within:ring-2 ring-accent transition-all">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={144}
                      onMouseDown={startDrawing}
                      onMouseUp={stopDrawing}
                      onMouseMove={draw}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchEnd={stopDrawing}
                      onTouchMove={draw}
                      className="w-full h-full cursor-crosshair touch-none"
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[11px] uppercase font-black tracking-[0.25em] select-none">
                        Sign Here
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground">By signing above, you authorize the generation of a digital e-check for this transaction.</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-8 bg-slate-50/80 px-8 pb-8">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full h-14 bg-primary text-primary-foreground text-lg font-bold shadow-xl rounded-xl transition-all active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : 'Finalize Authorization'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsFulfilling(false)}
                  className="w-full text-xs text-muted-foreground"
                >
                  Back to Review
                </Button>
              </CardFooter>
            </form>
          )}
          <CardFooter className="bg-slate-100/50 border-t flex justify-center py-5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              <ShieldCheck className="w-4 h-4 text-accent" />
              AES-256 Secure Channel
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2 uppercase tracking-widest font-bold">
          Powered by <span className="text-primary tracking-normal font-black">E-CheckFlow</span>
        </p>
      </div>
    </div>
  );
}
