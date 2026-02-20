import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { TransactionList } from '@/components/dashboard/transaction-list';

export default function DashboardOverview() {
  const { accounts, transactions } = getStore();
  const totalBalance = transactions.reduce((acc, tx) => tx.type === 'received' ? acc + tx.amount : acc - tx.amount, 10500.25);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-12 h-12" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/80 font-medium">Total Balance</CardDescription>
            <CardTitle className="text-3xl font-headline font-bold">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-primary-foreground/70">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Accounts</CardTitle>
            <Building2 className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Connected bank accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Checks</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Awaiting clearance</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Requests Received</CardTitle>
            <FileText className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Awaiting your approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/dashboard/send">
            <Plus className="mr-2 h-4 w-4" /> Send E-Check
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/requests">
            <Download className="mr-2 h-4 w-4" /> Request Payment
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold">Recent Transactions</h2>
            <Button variant="link" asChild>
              <Link href="/dashboard/history" className="text-accent hover:text-accent/80">View all</Link>
            </Button>
          </div>
          <TransactionList transactions={transactions.slice(0, 5)} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-headline font-bold">Quick Insights</h2>
          <Card className="shadow-sm border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span className="text-sm">Operations</span>
                  </div>
                  <span className="text-sm font-semibold">45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm">Marketing</span>
                  </div>
                  <span className="text-sm font-semibold">30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <span className="text-sm">Salaries</span>
                  </div>
                  <span className="text-sm font-semibold">25%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Savings Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">By using E-Checks instead of wire transfers, you saved approximately <span className="font-bold text-foreground">$145.00</span> in fees this month.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Building2, Clock } from 'lucide-react';