
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Share2, Copy, CheckCircle2, Loader2, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function RequestPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [requestUrl, setRequestUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [formData, setFormData] = useState({
    payerName: '',
    amount: '',
    purpose: '',
    dueDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // 1. Generate ID client-side for immediate URL display
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const newTxRef = doc(transactionsRef);
    const txId = newTxRef.id;

    // 2. Construct URLs precisely - explicitly including u= parameter
    const origin = window.location.origin;
    const url = `${origin}/pay/${txId}?u=${user.uid}`;
    
    const txData = {
      type: 'requested' as const,
      recipientName: user.displayName || 'Authorized Merchant',
      amount: amountNum,
      memo: formData.purpose,
      status: 'pending' as const,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      dueDate: formData.dueDate || null,
      payerTargetName: formData.payerName // Who we are asking to pay
    };

    // 3. Perform background write
    setDoc(newTxRef, txData)
      .then(() => {
        toast({ title: "Payment Request Live" });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: newTxRef.path,
          operation: 'create',
          requestResourceData: txData
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    // 4. Update UI instantly (Optimistic)
    setRequestUrl(url);
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`);
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!requestUrl) return;
    navigator.clipboard.writeText(requestUrl);
    toast({ title: "Copied Link!" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg"><Download className="w-6 h-6 text-accent" /></div>
        <div>
          <h1 className="text-2xl font-headline font-bold">Request Payment</h1>
          <p className="text-muted-foreground">Generate a secure QR code for clients to pay via e-check.</p>
        </div>
      </div>

      {requestUrl ? (
        <Card className="border-accent/30 bg-accent/5 overflow-hidden shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <CardTitle className="text-2xl text-primary font-bold">Secure Request Ready</CardTitle>
            <CardDescription>Show this QR code to {formData.payerName} to authorize payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="flex justify-center bg-white p-6 rounded-2xl shadow-sm inline-block mx-auto border border-accent/20">
              {qrCodeUrl && (
                <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="Payment Request QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-white p-3 rounded-lg border flex items-center justify-between gap-4 max-w-sm mx-auto shadow-sm">
              <span className="text-[10px] font-mono truncate text-muted-foreground flex-1 text-left">{requestUrl}</span>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={copyToClipboard}>
                <Copy className="w-3.5 h-3.5 mr-2" /> 
                <span className="text-xs">Copy</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-accent hover:bg-accent/90 shadow-sm" asChild>
                <Link href={requestUrl} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" /> Preview Link
                </Link>
              </Button>
              <Button variant="outline" className="shadow-sm" onClick={() => { setRequestUrl(''); setQrCodeUrl(''); }}>Create Another</Button>
            </div>
            <Button variant="link" className="text-muted-foreground text-xs" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="text-lg">Request Details</CardTitle>
                <CardDescription>Legal details for the check collection.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Payer Name (Business or Individual)</Label>
                    <Input id="payerName" placeholder="Client legal name" required value={formData.payerName} onChange={e => setFormData({...formData, payerName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Requested (USD)</Label>
                    <Input id="amount" type="number" step="0.01" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Payment Memo / Purpose</Label>
                  <Input id="purpose" placeholder="e.g. Consulting Services - Invoice #203" required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-primary min-w-[220px] shadow-md" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate Secure QR Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
