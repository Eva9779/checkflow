
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Sparkles, Send, Info, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiMemoAssistant } from '@/ai/flows/ai-memo-assistant';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const [formData, setFormData] = useState({
    recipientName: '',
    routingNumber: '',
    accountNumber: '',
    amount: '',
    purpose: '',
    memo: '',
    fromAccount: ''
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    setLoading(true);
    
    if (formData.routingNumber.length !== 9) {
      toast({ title: "Invalid Routing Number", description: "Must be 9 digits.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const txData = {
      type: 'sent',
      recipientName: formData.recipientName,
      amount: parseFloat(formData.amount),
      memo: formData.memo || formData.purpose,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };

    const txRef = collection(db, 'users', user.uid, 'transactions');
    addDoc(txRef, txData)
      .then(() => {
        toast({ title: "E-Check Initiated", description: `Successfully sent $${formData.amount} to ${formData.recipientName}.` });
        router.push('/dashboard');
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg">
          <Send className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold">Initiate E-Check</h1>
          <p className="text-muted-foreground">Send a secure digital check payment directly to a U.S. account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg">Recipient Details</CardTitle>
              <CardDescription>Enter the bank details of the person or business you are paying.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name / Business</Label>
                  <Input id="recipientName" placeholder="e.g. John Smith" required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">U.S. Routing Number (9 Digits)</Label>
                  <Input id="routingNumber" placeholder="XXXXXXXXX" maxLength={9} required value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" placeholder="Enter account number" required value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                Payment Context
                <div className="px-2 py-0.5 bg-accent/10 rounded-full text-[10px] text-accent flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Enhanced
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">Source Account</Label>
                <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={accLoading ? "Loading accounts..." : "Select a bank account"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} ({acc.accountNumber})
                      </SelectItem>
                    ))}
                    {(!accounts || accounts.length === 0) && !accLoading && (
                      <SelectItem disabled value="none">No accounts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Payment</Label>
                <Input id="purpose" placeholder="e.g. Monthly rent" required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo">Payment Memo (On Check)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-accent flex gap-1" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3" />
                    {aiLoading ? 'Generating...' : 'AI Suggest Memo'}
                  </Button>
                </div>
                <Textarea id="memo" placeholder="A clear description" className="resize-none h-20" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4 px-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-400 mt-0.5" />
              <p className="text-xs text-slate-500">Ensure bank details are correct to avoid fees.</p>
            </CardFooter>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Secured with Firestore Security Rules
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button type="button" variant="outline" className="flex-1 md:flex-none" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="flex-1 md:flex-none bg-primary min-w-[160px]" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Send Payment'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
