'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In a real app, you might show a more detailed overlay in development
      // For now, we use a toast to notify the user/developer
      toast({
        variant: 'destructive',
        title: 'Security Rule Denied',
        description: error.message,
      });
      
      // We throw the error so it shows up in the Next.js error overlay during development
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
