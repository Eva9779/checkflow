
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestPaymentPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard/send');
  }, [router]);

  return null;
}
