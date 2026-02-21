
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Sparkles, Send, Info, ShieldCheck, Loader2, Hash, MapPin, CreditCard, ReceiptText, AlertCircle } from 'lucide-react';
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
    routingNumber: '',
    accountNumber: '',
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
    
    // Basic Validation
    if (!formData.fromAccount) {
      toast({ title: "Account Required", description: "Please select a source account to debit.", variant: "destructive" });
      return;
    }

    if (formData.routingNumber.length !== 9) {
      toast({ title: "Invalid Routing Number", description: "U.S. Routing numbers must be exactly 9 digits.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let stripeTxId = null;

    // 1. Handle External Payment Gateway (Stripe)
    if (deliveryMethod === 'stripe') {
      try {
        const stripeResult = await initiateStripeACHPayout({
          amount: parseFloat(formData.amount),
          currency: 'usd',
          recipientRouting: formData.routingNumber,
          recipientAccount: formData.accountNumber,
          recipientName: formData.recipientName,
          description: formData.memo || formData.purpose
        });

        if (!stripeResult.success) {
          toast({ 
            title: "Payment Authorization Failed", 
            description: stripeResult.error || "The bank transfer could not be initiated.", 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        stripeTxId = stripeResult.id;
      } catch (err: any) {
        toast({ 
          title: "System Error", 
          description: "Could not connect to the payment processing server. Please try again.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
    }

    // 2. Record Transaction in Database
    const txData = {
      type: 'sent',
      recipientName: formData.recipientName,
      recipientAddress: formData.recipientAddress,
      amount: parseFloat(formData.amount),
      memo: formData.memo || formData.purpose,
      status: deliveryMethod === 'stripe' ? 'completed' : 'pending',
      date: new Date().toISOString().split('T')[0],
      checkNumber: deliveryMethod === 'print' ? formData.checkNumber : null,
      fromAccountId: formData.fromAccount,
      deliveryMethod,
      stripeTransferId: stripeTxId,
      createdAt: serverTimestamp()
    };

    const txRef = collection(db, 'users', user.uid, 'transactions');
    addDoc(txRef, txData)
      .then(() => {
        toast({ 
          title: deliveryMethod === 'stripe' ? "ACH Payout Sent" : "E-Check Generated", 
          description: deliveryMethod === 'stripe' 
            ? `Real-world ACH transfer for $${formData.amount} initiated via Stripe.`
            : `Check #${formData.checkNumber} for $${formData.amount} is ready for print.` 
        });
        router.push('/dashboard/history');
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg">
          <Send className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold">New Payment</h1>
          <p className="text-muted-foreground">Send a secure U.S. business payout via Printable Check or Stripe ACH.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="bg-secondary/30 p-6 border-b">
              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 block">Choose Delivery Method</Label>
              <RadioGroup 
                value={deliveryMethod} 
                onValueChange={(val: any) => setDeliveryMethod(val)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="print" id="method-print" className="peer sr-only" />
                  <Label
                    htmlFor="method-print"
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-transparent cursor-pointer peer-data-[state=checked]:border-accent transition-all hover:bg-slate-50 shadow-sm h-full"
                  >
                    <div className="flex items-center gap-3">
                      <ReceiptText className="w-5 h-5 text-accent" />
                      <div>
                        <p className="font-bold">Printable E-Check</p>
                        <p className="text-xs text-muted-foreground">Manual or Mobile Deposit</p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="stripe" id="method-stripe" className="peer sr-only" />
                  <Label
                    htmlFor="method-stripe"
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-transparent cursor-pointer peer-data-[state=checked]:border-accent transition-all hover:bg-slate-50 shadow-sm h-full"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-accent" />
                      <div>
                        <p className="font-bold">Stripe ACH Payout</p>
                        <p className="text-xs text-muted-foreground">Direct Real-World Deposit</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <CardHeader className="border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recipient Details</CardTitle>
                <CardDescription>Bank information for the payout.</CardDescription>
              </div>
              {deliveryMethod === 'print' && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                  <Hash className="w-4 h-4 text-accent" />
                  <Input 
                    className="w-20 h-7 border-none shadow-none p-0 font-mono font-bold text-center" 
                    value={formData.checkNumber} 
                    onChange={e => setFormData({...formData, checkNumber: e.target.value})}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient / Business Name</Label>
                  <Input id="recipientName" placeholder="Full Legal Name" required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Recipient Routing Number</Label>
                  <Input id="routingNumber" placeholder="9 Digits" maxLength={9} required value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Recipient Account Number</Label>
                  <Input id="accountNumber" placeholder="Account Number" required value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg">Payer Source</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">Select Source Account</Label>
                <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={accLoading ? "Loading..." : "Account to debit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} ({acc.accountNumber})
                      </SelectItem>
                    ))}
                    {(!accounts || accounts.length === 0) && !accLoading && (
                      <SelectItem disabled value="none">No accounts linked</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo">Purpose / Memo</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-accent flex gap-1" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3" />
                    {aiLoading ? 'Generating...' : 'AI Suggest Memo'}
                  </Button>
                </div>
                <Textarea id="memo" placeholder="Description for the bank statement" className="resize-none h-20" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 px-3 py-2 rounded-lg border border-green-100">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-green-800 font-medium">
                {deliveryMethod === 'stripe' ? 'Secured via Stripe ACH encryption' : 'Verified U.S. Business E-Check Format'}
              </span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="flex-1 md:flex-none bg-primary min-w-[200px]" disabled={loading || !formData.fromAccount}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (deliveryMethod === 'stripe' ? 'Send Stripe ACH' : 'Issue Printable Check')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
