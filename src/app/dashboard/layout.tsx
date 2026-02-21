'use client';

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, Send, History, Building2, UserCircle, LogOut, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.includes('/send')) return 'Send Payout';
    if (pathname.includes('/history')) return 'Transaction History';
    if (pathname.includes('/accounts')) return 'Bank Accounts';
    if (pathname.includes('/profile')) return 'My Profile';
    return 'Dashboard';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading Dashboard...</div>;
  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r shadow-sm">
          <SidebarHeader className="p-6">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-xs">EC</div>
              <span className="text-xl font-headline font-bold text-sidebar-foreground tracking-tight">E-CheckFlow</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/send'} tooltip="Send Payment">
                  <Link href="/dashboard/send" className="flex items-center gap-3">
                    <Send className="w-5 h-5" />
                    <span className="font-medium">Send Payout</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/history'} tooltip="Transaction History">
                  <Link href="/dashboard/history" className="flex items-center gap-3">
                    <History className="w-5 h-5" />
                    <span className="font-medium">History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/accounts'} tooltip="Bank Accounts">
                  <Link href="/dashboard/accounts" className="flex items-center gap-3">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">Bank Accounts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/profile'}>
                  <Link href="/dashboard/profile" className="flex items-center gap-3">
                    <UserCircle className="w-5 h-5" />
                    <span className="font-medium">My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-headline font-semibold text-foreground">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
              </Button>
              <Link href="/dashboard/profile" className="flex items-center gap-3 ml-2 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground leading-none">{user.displayName || user.email}</p>
                  <p className="text-xs text-muted-foreground">Business Account</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary group-hover:ring-2 ring-accent transition-all">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
          </header>
          <main className="p-6 md:p-8 flex-1 overflow-auto max-w-7xl mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
