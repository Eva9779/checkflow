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
import { Sparkles, Send, ShieldCheck, Loader2, CreditCard, ReceiptText, Info, Building2, MapPin, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiMemoAssistant } from '@/ai/flows/ai-memo-assistant';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { initiateStripeACHPayout } from '@/app/actions/stripe-payout';
import { SignaturePad } from '@/components/dashboard/signature-pad';

export default function SendPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const accountsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'bankAccounts');
  }, [db, user]);

  const { data: accounts, isLoading: accLoading } = useCollection(accountsQuery);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'stripe'>('print');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientAddress: '',
    recipientRouting: '',
    recipientAccount: '',
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

    const selectedAccount = accounts?.find(a => a.id === formData.fromAccount);
    if (!selectedAccount) {
      toast({ 
        title: "Source Required", 
        description: "Please select a business bank account as the origin for this payout.", 
        variant: "destructive" 
      });
      return;
    }

    if (deliveryMethod === 'print' && !signatureData) {
      toast({ 
        title: "Signature Required", 
        description: "Please provide an authorized signature to issue this printable check.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    let stripeTxId = null;

    try {
      if (deliveryMethod === 'stripe') {
        if (!formData.recipientRouting || !formData.recipientAccount) {
          toast({ title: "Recipient Details Missing", description: "Routing and Account numbers are required for ACH transfers.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const stripeResult = await initiateStripeACHPayout({
          amount: amountNum,
          currency: 'usd',
          description: formData.memo || formData.purpose,
          recipientName: formData.recipientName,
          recipientRouting: formData.recipientRouting,
          recipientAccount: formData.recipientAccount,
          payerRouting: selectedAccount.routingNumber,
          payerAccount: selectedAccount.accountNumber
        });

        if (!stripeResult.success) {
          toast({ 
            title: "Stripe Authorization Error", 
            description: stripeResult.error, 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        stripeTxId = stripeResult.id;
      }

      const txData = {
        senderUserProfileId: user.uid,
        recipientName: formData.recipientName,
        recipientAddress: formData.recipientAddress,
        recipientRouting: deliveryMethod === 'stripe' ? formData.recipientRouting : null,
        recipientAccount: deliveryMethod === 'stripe' ? `****${formData.recipientAccount.slice(-4)}` : null,
        amount: amountNum,
        memo: formData.memo || formData.purpose,
        status: deliveryMethod === 'stripe' ? 'completed' : 'pending',
        initiatedAt: new Date().toISOString().split('T')[0],
        checkNumber: deliveryMethod === 'print' ? formData.checkNumber : null,
        senderBankAccountId: formData.fromAccount,
        payerBankName: selectedAccount.bankName,
        payerRoutingNumber: selectedAccount.routingNumber,
        payerAccountNumber: `****${selectedAccount.accountNumber.slice(-4)}`,
        deliveryMethod,
        stripeTransferId: stripeTxId,
        signatureData: deliveryMethod === 'print' ? signatureData : null,
        createdAt: serverTimestamp()
      };

      const txRef = collection(db, 'eCheckTransactions');
      
      addDoc(txRef, txData).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'create',
          requestResourceData: txData
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({ 
        title: "Payout Authorized", 
        description: deliveryMethod === 'stripe' 
          ? "The ACH transfer has been initiated from your selected business source." 
          : "The printable e-check has been generated and is ready for deposit." 
      });
      
      router.push('/dashboard/history');
    } catch (err: any) {
      toast({ 
        title: "Submission Error", 
        description: "The payout could not be processed. Please check your network connection.", 
        variant: "destructive" 
      });
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
          <p className="text-muted-foreground">Securely authorize a payout using your business account details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-secondary/30 p-6 border-b">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Delivery Configuration</Label>
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
                        <p className="text-[10px] text-muted-foreground">Manual Business MICR</p>
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
                        <p className="text-[10px] text-muted-foreground">Direct Bank Authorization</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" /> Business Source Account
              </CardTitle>
              <CardDescription>Select the account and routing number used as the origin of funds.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">Business Bank Source</Label>
                <Select value={formData.fromAccount} onValueChange={val => setFormData({...formData, fromAccount: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={accLoading ? "Loading accounts..." : "Choose business account"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} (Ending in {acc.accountNumber.slice(-4)})
                      </SelectItem>
                    ))}
                    {(!accounts || accounts.length === 0) && !accLoading && (
                      <SelectItem disabled value="none">No accounts found. Link a source first.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Recipient Details</CardTitle>
              <CardDescription>Enter the legal payee information and bank details for ACH.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Legal Name</Label>
                  <Input id="recipientName" placeholder="Business or Individual" required value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientRouting">Recipient Routing Number</Label>
                  <Input 
                    id="recipientRouting" 
                    maxLength={9} 
                    placeholder="9-digit Routing" 
                    required={deliveryMethod === 'stripe'}
                    value={formData.recipientRouting} 
                    onChange={e => setFormData({...formData, recipientRouting: e.target.value.replace(/\D/g, '')})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientAccount">Recipient Account Number</Label>
                  <Input 
                    id="recipientAccount" 
                    type="password" 
                    placeholder="Account Number" 
                    required={deliveryMethod === 'stripe'}
                    value={formData.recipientAccount} 
                    onChange={e => setFormData({...formData, recipientAccount: e.target.value.replace(/\D/g, '')})} 
                  />
                </div>
              </div>

              {deliveryMethod === 'print' && (
                <div className="space-y-2">
                  <Label htmlFor="recipientAddress" className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Recipient Mailing Address (Optional)
                  </Label>
                  <Input id="recipientAddress" placeholder="Street, City, State, Zip" value={formData.recipientAddress} onChange={e => setFormData({...formData, recipientAddress: e.target.value})} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-accent" /> Authorization
              </CardTitle>
              <CardDescription>Provide a digital signature to authorize this payout issuance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <SignaturePad onSave={(data) => setSignatureData(data)} onClear={() => setSignatureData(null)} />
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-secondary/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-accent" /> Memo Details
              </CardTitle>
              <CardDescription>Note for recipient bank records.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Payout Purpose (Internal)</Label>
                <Input id="purpose" placeholder="e.g., Consulting Invoice #123" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="memo">Memo Line</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-accent font-bold" onClick={handleSuggestMemo} disabled={aiLoading}>
                    <Sparkles className="w-3 h-3 mr-1" /> AI Suggest
                  </Button>
                </div>
                <Textarea id="memo" placeholder="Brief note for the recipient" className="h-20" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" className="min-w-[200px] bg-primary font-bold" disabled={loading || !formData.fromAccount}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authorizing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {deliveryMethod === 'stripe' ? 'Send ACH Payout' : 'Issue Printable E-Check'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
