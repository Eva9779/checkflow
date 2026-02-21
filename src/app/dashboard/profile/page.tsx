'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2, Save, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser) return;

    setLoading(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
      });
      toast({
        title: "Profile Updated",
        description: "Your display name has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-headline font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your personal profile and account preferences.</p>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="border-b bg-secondary/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-accent" /> Personal Information
          </CardTitle>
          <CardDescription>Update the name associated with your business account for e-check issuance.</CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateProfile}>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name / Business Entity</Label>
              <Input
                id="displayName"
                placeholder="e.g. Acme Corp or John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground">This name will appear as the "Payer" on your issued checks.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50 cursor-not-allowed opacity-70"
              />
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-accent" />
                Email changes are restricted for security. Contact support for verification.
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-slate-50/50 p-6 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-primary min-w-[140px] font-bold">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Profile
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
