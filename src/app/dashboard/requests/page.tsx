
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Share2, Copy, CheckCircle2, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

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
    setLoading(true);

    const txData = {
      type: 'requested',
      recipientName: formData.payerName,
      amount: parseFloat(formData.amount),
      memo: `Request: ${formData.purpose}`,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };

    const txRef = collection(db, 'users', user.uid, 'transactions');
    addDoc(txRef, txData)
      .then((docRef) => {
        const url = `https://echeckflow.com/pay/req_${docRef.id}`;
        setRequestUrl(url);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`);
        toast({ title: "Payment Request Created" });
      })
      .catch((error) => {
        console.error(error);
        toast({ title: "Failed to create request", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(requestUrl);
    toast({ title: "Copied Link!" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg"><Download className="w-6 h-6 text-accent" /></div>
        <div>
          <h1 className="text-2xl font-headline font-bold">Request Payment</h1>
          <p className="text-muted-foreground">Generate a secure QR code for your clients to pay via e-check.</p>
        </div>
      </div>

      {requestUrl ? (
        <Card className="border-accent/30 bg-accent/5 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <CardTitle className="text-2xl text-primary font-bold">Request Ready</CardTitle>
            <CardDescription>Show this QR code to {formData.payerName} or share the link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="flex justify-center bg-white p-6 rounded-2xl shadow-sm inline-block mx-auto border border-accent/20">
              {qrCodeUrl && (
                <div className="relative w-[200px] h-[200px]">
                  <img 
                    src={qrCodeUrl} 
                    alt="Payment Request QR Code" 
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-white p-3 rounded-lg border flex items-center justify-between gap-4 max-w-sm mx-auto">
              <span className="text-xs font-mono truncate text-muted-foreground">{requestUrl}</span>
              <Button size="sm" variant="ghost" className="h-8" onClick={copyToClipboard}><Copy className="w-3 h-3 mr-2" /> Copy</Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-accent hover:bg-accent/90"><Share2 className="w-4 h-4 mr-2" /> Share via Email</Button>
              <Button variant="outline" onClick={() => { setRequestUrl(''); setQrCodeUrl(''); }}>Create Another</Button>
            </div>
            <Button variant="link" className="text-muted-foreground" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="text-lg">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Payer Name</Label>
                    <Input id="payerName" placeholder="Client name" required value={formData.payerName} onChange={e => setFormData({...formData, payerName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input id="amount" type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input id="purpose" placeholder="e.g. Invoice #203" required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-primary min-w-[200px]" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
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
