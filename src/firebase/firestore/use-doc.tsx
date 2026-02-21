'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastRefPath = useRef<string | null>(null);

  useEffect(() => {
    // If ref is null, we are still waiting for IDs to resolve
    if (!ref) {
      setLoading(true);
      return;
    }

    // Prevent unnecessary flickering if the ref hasn't actually changed
    if (lastRefPath.current === ref.path) {
      return;
    }

    setLoading(true);
    setError(null);
    lastRefPath.current = ref.path;

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data()!, id: snapshot.id });
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(serverError);
        setData(null);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      lastRefPath.current = null;
    };
  }, [ref]);

  return { data, loading, error };
}
