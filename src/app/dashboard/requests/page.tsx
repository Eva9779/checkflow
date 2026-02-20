'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addTransactionAction } from '@/lib/store';

export default function RequestPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestUrl, setRequestUrl] = useState('');

  const [formData, setFormData] = useState({
    payerName: '',
    amount: '',
    purpose: '',
    dueDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      // Mock generating a request link
      const mockId = Math.random().toString(36).substr(2, 9);
      setRequestUrl(`https://echeckflow.com/pay/req_${mockId}`);
      
      addTransactionAction({
        type: 'requested',
        recipientName: formData.payerName,
        amount: parseFloat(formData.amount),
        memo: `Request: ${formData.purpose}`
      });

      toast({
        title: "Payment Request Created",
        description: "You can now share this link with the payer."
      });
      setLoading(false);
    }, 1200);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(requestUrl);
    toast({ title: "Copied!", description: "Request link copied to clipboard." });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 rounded-lg">
          <Download className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold">Request Payment</h1>
          <p className="text-muted-foreground">Generate an e-check request for your clients or customers.</p>
        </div>
      </div>

      {requestUrl ? (
        <Card className="border-accent/30 bg-accent/5 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <CardTitle className="text-2xl">Request Generated</CardTitle>
            <CardDescription>Share this link with {formData.payerName} to get paid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="bg-white p-4 rounded-lg border flex items-center justify-between gap-4">
              <span className="text-sm font-mono truncate text-muted-foreground">{requestUrl}</span>
              <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-accent hover:bg-accent/90">
                <Share2 className="w-4 h-4 mr-2" /> Share via Email
              </Button>
              <Button variant="outline" onClick={() => setRequestUrl('')}>
                Create Another Request
              </Button>
            </div>
            <Button variant="link" className="text-muted-foreground" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="text-lg">Request Details</CardTitle>
                <CardDescription>Specify who you are requesting payment from and for what.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Payer Name / Business</Label>
                    <Input 
                      id="payerName" 
                      placeholder="Who is paying you?" 
                      required 
                      value={formData.payerName}
                      onChange={e => setFormData({...formData, payerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Requested Amount (USD)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      required 
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of Request</Label>
                  <Input 
                    id="purpose" 
                    placeholder="e.g. Invoice #203, Web Design deposit" 
                    required 
                    value={formData.purpose}
                    onChange={e => setFormData({...formData, purpose: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input 
                    id="dueDate" 
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Personal Note (Optional)</Label>
                  <Textarea 
                    id="note" 
                    placeholder="Add a friendly note for the payer..." 
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[180px]" disabled={loading}>
                {loading ? 'Creating...' : 'Generate Request Link'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}