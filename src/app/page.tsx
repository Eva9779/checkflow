import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRightLeft, Clock, Zap, Phone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-primary text-white py-2.5 px-6 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-sm z-20">
        <Phone className="w-4 h-4" />
        We print and we mail bulk checks. Place your order now at 1-213-603-6351
      </div>
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white font-bold">EC</div>
          <span className="text-2xl font-headline font-bold text-foreground">E-CheckFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm font-medium hover:text-accent transition-colors">Features</Link>
          <Link href="#security" className="text-sm font-medium hover:text-accent transition-colors">Security</Link>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90">
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-20 px-6 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-headline font-extrabold mb-6 text-foreground tracking-tight">
            Seamless Payouts for <span className="text-accent">Modern Business</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            The most intuitive way to issue professional e-checks and ACH payouts. Secure, fast, and compliant.
          </p>
          <div className="flex justify-center">
            <Button size="lg" asChild className="h-14 px-10 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/login">Start Sending Payments</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-headline font-bold text-center mb-16">Why Choose E-CheckFlow?</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                  <ArrowRightLeft className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-4">Direct Bank Payouts</h3>
                <p className="text-muted-foreground">Skip the card processing fees. Issue payments directly from your business bank accounts via ACH or E-Check.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-4">Reliable Settlements</h3>
                <p className="text-muted-foreground">Standardized processing ensures your vendor and contractor payouts are tracked and settled reliably.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-4">Live Stripe Security</h3>
                <p className="text-muted-foreground">Bank-level encryption and secure ACH verification through the trusted Stripe network.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto bg-primary text-primary-foreground rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10">
              <Zap className="w-64 h-64" />
            </div>
            <h2 className="text-3xl md:text-4xl font-headline font-bold mb-6">Ready to streamline your payouts?</h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">Join businesses using E-CheckFlow to handle their professional vendor and contractor payments.</p>
            <Button size="lg" asChild className="bg-accent text-white hover:bg-accent/90 h-14 px-10 text-lg">
              <Link href="/login">Create Free Account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">EC</div>
            <span className="text-xl font-headline font-bold text-foreground">E-CheckFlow</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-accent transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-accent transition-colors">Contact Support</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 E-CheckFlow Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
