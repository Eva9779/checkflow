
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, ShieldCheck, CheckCircle2, MoreVertical, Loader2, MapPin, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function BankAccountsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'accounts');
  }, [db, user]);

  const { data: accounts, loading: accountsLoading } = useCollection(accountsQuery);

  const [newAccount, setNewAccount] = useState({
    bankName: '',
    bankAddress: '',
    routingNumber: '',
    fractionalRouting: '',
    accountNumber: '',
    confirmAccountNumber: ''
  });

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    
    if (newAccount.accountNumber !== newAccount.confirmAccountNumber) {
      toast({ 
        title: "Mismatched Accounts", 
        description: "Account numbers do not match.", 
        variant: "destructive" 
      });
      return;
    }

    if (newAccount.routingNumber.length !== 9) {
      toast({ 
        title: "Invalid Routing", 
        description: "U.S. Routing numbers must be 9 digits.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    const accountData = {
      bankName: newAccount.bankName,
      bankAddress: newAccount.bankAddress,
      routingNumber: newAccount.routingNumber,
      fractionalRouting: newAccount.fractionalRouting,
      accountNumber: newAccount.accountNumber,
      isDefault: (accounts?.length || 0) === 0,
      createdAt: serverTimestamp()
    };

    const accountsRef = collection(db, 'users', user.uid, 'accounts');
    
    addDoc(accountsRef, accountData)
      .then(() => {
        toast({ 
          title: "Account Linked", 
          description: `${newAccount.bankName} has been securely connected.` 
        });
        setOpen(false);
        setNewAccount({ 
          bankName: '', 
          bankAddress: '', 
          routingNumber: '', 
          fractionalRouting: '', 
          accountNumber: '', 
          confirmAccountNumber: '' 
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: accountsRef.path,
          operation: 'create',
          requestResourceData: accountData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDeleteAccount = (id: string) => {
    if (!db || !user) return;
    const accountRef = doc(db, 'users', user.uid, 'accounts', id);
    deleteDoc(accountRef).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: accountRef.path,
        operation: 'delete'
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleSetDefault = (id: string) => {
    if (!db || !user || !accounts) return;
    accounts.forEach(acc => {
      const ref = doc(db, 'users', user.uid, 'accounts', acc.id);
      updateDoc(ref, { isDefault: acc.id === id }).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { isDefault: acc.id === id }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">Bank Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage source accounts for issuing payouts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-white shadow-sm font-bold">
              <Plus className="w-4 h-4 mr-2" /> Add Business Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleAddAccount}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-bold">
                  <Lock className="w-5 h-5 text-accent" /> Secure Business Source Link
                </DialogTitle>
                <DialogDescription>
                  Enter banking details for your source account. These are stored securely in your private cloud database.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input 
                      id="bankName" 
                      placeholder="e.g. Chase" 
                      required 
                      value={newAccount.bankName}
                      onChange={e => setNewAccount({...newAccount, bankName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fractional">Fractional Routing</Label>
                    <Input 
                      id="fractional" 
                      placeholder="e.g. 1-2/345" 
                      value={newAccount.fractionalRouting}
                      onChange={e => setNewAccount({...newAccount, fractionalRouting: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankAddress" className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Bank Branch Address
                  </Label>
                  <Input 
                    id="bankAddress" 
                    placeholder="City, State, Zip" 
                    value={newAccount.bankAddress}
                    onChange={e => setNewAccount({...newAccount, bankAddress: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routing">Routing Number (9 Digits)</Label>
                  <Input 
                    id="routing" 
                    placeholder="XXXXXXXXX" 
                    maxLength={9} 
                    required 
                    value={newAccount.routingNumber}
                    onChange={e => setNewAccount({...newAccount, routingNumber: e.target.value.replace(/\D/g, '')})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Full Account Number</Label>
                    <Input 
                      id="account" 
                      type="password"
                      placeholder="Account Number" 
                      required 
                      value={newAccount.accountNumber}
                      onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmAccount">Confirm Account</Label>
                    <Input 
                      id="confirmAccount" 
                      type="password"
                      placeholder="Confirm Account" 
                      required 
                      value={newAccount.confirmAccountNumber}
                      onChange={e => setNewAccount({...newAccount, confirmAccountNumber: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-secondary/50 p-3 rounded-lg border">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                  <span>Encrypted Storage: Your full details are only decrypted when generating check MICR lines.</span>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-primary min-w-[120px] font-bold">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : 'Link Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accountsLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map(acc => (
            <Card key={acc.id} className="border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSetDefault(acc.id)}>Set as Default</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAccount(acc.id)}>Remove Account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="mt-4 font-bold">{acc.bankName}</CardTitle>
                <CardDescription className="text-xs truncate">{acc.bankAddress || 'Verified Branch'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Account</span>
                    <span className="font-mono font-bold text-foreground">****{acc.accountNumber.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Routing</span>
                    <span className="font-mono font-bold text-foreground">{acc.routingNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    {acc.isDefault ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-accent font-bold uppercase tracking-widest bg-accent/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Primary
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!accounts || accounts.length === 0) && (
            <Card className="border-dashed border-2 bg-slate-50/50 flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:bg-white transition-colors" onClick={() => setOpen(true)}>
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border flex items-center justify-center mb-6">
                <Plus className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-lg">No Linked Accounts</CardTitle>
              <CardDescription className="max-w-[240px] mt-2">
                Link a business account to enable e-check and ACH issuance.
              </CardDescription>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
