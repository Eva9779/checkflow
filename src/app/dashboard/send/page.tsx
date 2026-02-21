
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Send, ShieldCheck, Loader2, Hash, CreditCard, ReceiptText, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiMemoAssistant } from '@/ai/flows/ai-memo-assistant';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { initiateStripeACHPayout } from '@/app/actions/stripe-payout';

export default function SendPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'accounts');
  }, [db, user]);

  const { data: accounts, loading: accLoading } = useCollection(accountsQuery);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'stripe'>('print');

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientAddress: '',
    amount: '',
    purpose: '',
    memo: '',
    fromAccount: '',
    checkNumber: Math.floor(1000 + Math.random() * 9000).toString()
  });

  const handleSuggestMemo = async () => {
    if (!formData.recipientName || !formData.amount || !formData.purpose) {
      toast({
        title: "Missing Information",
        description: "Please fill in recipient, amount, and purpose for AI suggestion.",
        variant: "destructive"
      });
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiMemoAssistant({
        recipientName: formData.recipientName,
        amount: `$${formData.amount}`,
        purpose: formData.purpose
      });
      setFormData(prev => ({ ...prev, memo: result.suggestedMemo }));
      toast({ title: "AI Suggestion Ready" });
    } catch (error) {
      toast({ title: "AI Error", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    setLoading(true);
    let stripeTxId = null;

    try {
      if (deliveryMethod === 'stripe') {
        const stripeResult = await initiateStripeACHPayout({
          amount: amountNum,
          currency: 'usd',
          description: `TO: ${formData.recipientName} - ${formData.memo || formData.purpose}`
        });

        if (!stripeResult.success) {
          toast({ 
            title: "Stripe Payment Failed", 
            description: stripeResult.error, 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        stripeTxId = stripeResult.id;
      }

      const txData = {
        type: 'sent',
        recipientName: formData.recipientName,
        recipientAddress: formData.recipientAddress,
        amount: amountNum,
        memo: formData.memo || formData.purpose,
        status: deliveryMethod === 'stripe' ? 'completed' : 'pending',
        date: new Date().toISOString().split('T')[0],
        checkNumber: deliveryMethod === 'print' ? formData.checkNumber : null,
        fromAccountId: deliveryMethod === 'print' ? formData.fromAccount : 'stripe-balance',
        deliveryMethod,
        stripeTransferId: stripeTxId,
        createdAt: serverTimestamp()
      };

      const txRef = collection(db, 'users', user.uid, 'transactions');
      
      addDoc(txRef, txData).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({ 
        title: "Payout Successful", 
        description: deliveryMethod === 'stripe' ? "Live ACH initiated." : "Check generated." 
      });
      
      router.push('/dashboard/history');
    } catch (err: any) {
      toast({ title: "System Error", description: "Could not finalize payout.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg text-accent">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold">Issue New Payout</h1>
          <p className="text-muted-foreground">Securely send funds via Live ACH or Professional Printable Check.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-secondary/30 p-6 border-b">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Delivery Method Configuration</Label>
              <RadioGroup 
                value={deliveryMethod} 
                onValueChange={(val: any) => setDeliveryMethod(val)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="print" id="method-print" className="peer sr-only" />
                  <Label
                    htmlFor="method-print"
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-transparent cursor-pointer peer-data-[state=checked]:border-accent peer-data-[state=checked]:ring-2 ring-accent/20 transition-all hover:bg-slate-50 shadow-sm h-full"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        <ReceiptText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Printable E-Check</p>
                        <p className="text-[10px] text-muted-foreground">Manual Source Account</p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="stripe" id="method-stripe" className="peer sr-only" />
                  <Label
                    htmlFor="method-stripe"
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-transparent cursor-pointer peer-data-[state=checked]:border-accent peer-data-[state=checked]:ring-2 ring-accent/20 transition-all hover:bg-slate-50 shadow-sm h-full"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Live ACH Transfer</p>
                        <p className="text-[10px] text-muted-foreground">From Stripe Balance</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <CardHeader className="border-b">
              <CardTitle className="text-lg">Recipient Information</CardTitle>
              <CardDescription>Enter the legal name and payout amount.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input id="recipientName" placeholder="Payee Name" required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              {deliveryMethod === 'stripe' && (
                <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-900">Stripe Balance Payout</p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Funds will be withdrawn from your **Stripe Balance** and sent to the accounts verified in your Stripe Dashboard.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {deliveryMethod === 'print' && (
            <Card className="border-none shadow-md">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="text-lg">Financial Source</CardTitle>
                <CardDescription>Required to generate the check's MICR line.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fromAccount">Select Business Account</Label>
                  <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder={accLoading ? "Loading accounts..." : "Choose account"} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bankName} ({acc.accountNumber})
                        </SelectItem>
                      ))}
                      {(!accounts || accounts.length === 0) && !accLoading && (
                        <SelectItem disabled value="none">No accounts linked.</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg">Memo Details</CardTitle>
              <CardDescription>Professional note for the recipient.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Payout Purpose</Label>
                <Input id="purpose" placeholder="e.g., Consulting Fees" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo">Check Memo</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-accent font-bold" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3 mr-1" /> AI Suggest
                  </Button>
                </div>
                <Textarea id="memo" placeholder="Note on check" className="h-20" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" className="min-w-[200px]" disabled={loading || (deliveryMethod === 'print' && !formData.fromAccount)}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {deliveryMethod === 'stripe' ? 'Send ACH Payment' : 'Issue Check'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
