
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
    
    // Strict Validation
    if (deliveryMethod === 'print' && !formData.fromAccount) {
      toast({ title: "Account Required", description: "Source account is required for printable checks.", variant: "destructive" });
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive payout amount.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let stripeTxId = null;

    try {
      // 1. Handle External Payment Gateway (Stripe)
      if (deliveryMethod === 'stripe') {
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
            title: "Live Authorization Failed", 
            description: stripeResult.error || "The bank transfer could not be initiated.", 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        stripeTxId = stripeResult.id;
      }

      // 2. Record Transaction in Database (Optimistic)
      const txData = {
        type: 'sent',
        recipientName: formData.recipientName,
        recipientAddress: formData.recipientAddress,
        amount: parseFloat(formData.amount),
        memo: formData.memo || formData.purpose,
        status: deliveryMethod === 'stripe' ? 'completed' : 'pending',
        date: new Date().toISOString().split('T')[0],
        checkNumber: deliveryMethod === 'print' ? formData.checkNumber : null,
        fromAccountId: deliveryMethod === 'print' ? formData.fromAccount : 'stripe-vault',
        deliveryMethod,
        stripeTransferId: stripeTxId,
        createdAt: serverTimestamp()
      };

      const txRef = collection(db, 'users', user.uid, 'transactions');
      
      // Initiate background write
      addDoc(txRef, txData)
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: txRef.path,
            operation: 'create',
            requestResourceData: txData
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      toast({ 
        title: deliveryMethod === 'stripe' ? "Live ACH Authorized" : "Check Generated", 
        description: deliveryMethod === 'stripe' 
          ? `Real-world bank transfer for $${formData.amount} initiated successfully.`
          : `Check #${formData.checkNumber} is ready for bank deposit.` 
      });
      
      router.push('/dashboard/history');
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "System Error", 
        description: "A critical error occurred during payout execution.", 
        variant: "destructive" 
      });
    } finally {
      setTimeout(() => setLoading(false), 500);
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
                        <p className="font-bold text-sm">Professional E-Check</p>
                        <p className="text-[10px] text-muted-foreground">Manual or Mobile Deposit</p>
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
                        <p className="text-[10px] text-muted-foreground">Direct Real-World Deposit</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <CardHeader className="border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recipient Information</CardTitle>
                <CardDescription>Verified bank details for the payout destination.</CardDescription>
              </div>
              {deliveryMethod === 'print' && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                  <Hash className="w-3 h-3 text-accent" />
                  <Input 
                    className="w-20 h-7 border-none shadow-none p-0 font-mono font-bold text-center text-sm" 
                    value={formData.checkNumber} 
                    onChange={e => setFormData({...formData, checkNumber: e.target.value})}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Legal Name</Label>
                  <Input id="recipientName" placeholder="Business or Individual Name" required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              {deliveryMethod === 'print' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Bank Routing Number</Label>
                    <Input id="routingNumber" placeholder="9 Digits" maxLength={9} required value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Bank Account Number</Label>
                    <Input id="accountNumber" placeholder="Full Account Number" required value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} />
                  </div>
                </div>
              )}

              {deliveryMethod === 'stripe' && (
                <div className="flex items-start gap-3 bg-secondary/20 p-4 rounded-xl border border-secondary">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Stripe Payout Notice</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This transaction will move funds from your Stripe Payout balance to the primary bank account verified in your <strong>Stripe Dashboard</strong>. 
                      Arbitrary third-party transfers via Stripe ACH typically require Stripe Connect.
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
                <CardDescription>Choose the authorized account to debit for this check.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fromAccount">Select Business Account</Label>
                  <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder={accLoading ? "Loading verified accounts..." : "Choose source account"} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bankName} (****{acc.accountNumber.slice(-4)})
                        </SelectItem>
                      ))}
                      {(!accounts || accounts.length === 0) && !accLoading && (
                        <SelectItem disabled value="none">No accounts linked. Go to Bank Accounts.</SelectItem>
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
              <CardDescription>Add a purpose for your records.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo" className="flex items-center gap-2">Purpose / Memo</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-[10px] text-accent font-bold uppercase tracking-wider flex gap-1" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3" />
                    {aiLoading ? 'Optimizing...' : 'AI Memo Assist'}
                  </Button>
                </div>
                <Textarea id="memo" placeholder="Internal tracking memo (e.g. Invoice #204 - Marketing Consulting)" className="resize-none h-24 text-sm" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-green-50/80 px-4 py-3 rounded-xl border border-green-100/50 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-green-900 font-semibold tracking-tight">
                {deliveryMethod === 'stripe' ? 'Authorized via Stripe Banking Network' : 'Bank-Compliant MICR Document Generation'}
              </span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button type="button" variant="outline" className="h-12 px-6" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="flex-1 md:flex-none h-12 bg-primary min-w-[240px] font-bold text-base shadow-lg hover:shadow-primary/20" disabled={loading || (deliveryMethod === 'print' && !formData.fromAccount)}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Authorizing...
                  </>
                ) : (
                  deliveryMethod === 'stripe' ? 'Execute Live ACH' : 'Issue Professional Check'
                )}
              </Button>
            </div>
          </div>
          
          {deliveryMethod === 'stripe' && (
            <div className="flex items-center gap-2 justify-center text-[10px] text-amber-600 font-bold uppercase tracking-widest animate-pulse">
              <AlertCircle className="w-3 h-3" />
              Live Mode Active: Transaction will move real currency
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
