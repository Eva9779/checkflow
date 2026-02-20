
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Sparkles, Send, Info, ShieldCheck, Loader2, Hash, MapPin } from 'lucide-react';
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
      recipientAddress: formData.recipientAddress,
      amount: parseFloat(formData.amount),
      memo: formData.memo || formData.purpose,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      checkNumber: formData.checkNumber,
      fromAccountId: formData.fromAccount,
      createdAt: serverTimestamp()
    };

    const txRef = collection(db, 'users', user.uid, 'transactions');
    addDoc(txRef, txData)
      .then(() => {
        toast({ title: "E-Check Generated", description: `Check #${formData.checkNumber} for $${formData.amount} is ready.` });
        router.push('/dashboard/history');
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
          <h1 className="text-2xl font-headline font-bold">Issue New E-Check</h1>
          <p className="text-muted-foreground">Generate a secure digital business check for print or ACH processing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-secondary/30 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payee & Check Info</CardTitle>
                <CardDescription>Legal details for the check face.</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                <Hash className="w-4 h-4 text-accent" />
                <Input 
                  className="w-20 h-7 border-none shadow-none p-0 font-mono font-bold text-center" 
                  value={formData.checkNumber} 
                  onChange={e => setFormData({...formData, checkNumber: e.target.value})}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Payee Name / Business</Label>
                  <Input id="recipientName" placeholder="Pay to the order of..." required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientAddress" className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Payee Address (Optional for mailing)
                </Label>
                <Input id="recipientAddress" placeholder="Street, City, State, Zip" value={formData.recipientAddress} onChange={e => setFormData({...formData, recipientAddress: e.target.value})} />
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
              <CardTitle className="text-lg">Issuing Context</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">Source Bank Account (Payer)</Label>
                <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={accLoading ? "Loading accounts..." : "Select the account to pay from"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} ({acc.accountNumber})
                      </SelectItem>
                    ))}
                    {(!accounts || accounts.length === 0) && !accLoading && (
                      <SelectItem disabled value="none">No linked accounts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Internal Purpose</Label>
                <Input id="purpose" placeholder="e.g. Q3 Vendor Payout" required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo">Check Memo (Printed on Face)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-accent flex gap-1" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3" />
                    {aiLoading ? 'Generating...' : 'AI Suggest Memo'}
                  </Button>
                </div>
                <Textarea id="memo" placeholder="Description to appear on the check" className="resize-none h-20" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Verified U.S. Business E-Check Format
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="flex-1 md:flex-none bg-primary min-w-[180px]" disabled={loading || !formData.fromAccount}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Issue & View Check'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
