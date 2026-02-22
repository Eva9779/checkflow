
/**
 * Internal state store is deprecated in favor of direct Firebase Firestore persistence.
 * All accounts and transactions are now stored securely in the cloud.
 */
export const getStore = () => ({ accounts: [], transactions: [] });
